import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ProjectData {
  id: string;
  numero_projeto: number;
  cliente_condominio_nome: string;
  cliente_cidade: string | null;
  cliente_estado: string | null;
  vendedor_nome: string;
}

interface SaleFormData {
  qtd_apartamentos?: number | null;
  projeto_id?: string;
}

export function useImplantacaoIntegration() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Create customer in portfolio when starting implantation
  const createCustomerOnStart = async (project: ProjectData, saleForm?: SaleFormData) => {
    try {
      // Check if customer already exists for this project
      const { data: existingCustomer } = await supabase
        .from('customer_portfolio')
        .select('id')
        .eq('project_id', project.id)
        .single();

      if (existingCustomer) {
        // Update status if customer exists
        await supabase
          .from('customer_portfolio')
          .update({ status_implantacao: 'EM_IMPLANTACAO' })
          .eq('id', existingCustomer.id);
        return existingCustomer.id;
      }

      // Create new customer with EM_IMPLANTACAO status
      const { data: newCustomer, error } = await supabase
        .from('customer_portfolio')
        .insert({
          razao_social: project.cliente_condominio_nome,
          contrato: `TEMP-${project.numero_projeto}`, // Temporary contract number
          endereco: project.cliente_cidade && project.cliente_estado 
            ? `${project.cliente_cidade}, ${project.cliente_estado}` 
            : null,
          unidades: saleForm?.qtd_apartamentos || null,
          status_implantacao: 'EM_IMPLANTACAO',
          project_id: project.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      console.log('Customer created with EM_IMPLANTACAO status:', newCustomer?.id);
      return newCustomer?.id;
    } catch (error) {
      console.error('Error creating customer on start:', error);
      return null;
    }
  };

  // Update customer status to IMPLANTADO when implantation is completed
  const updateCustomerOnComplete = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('customer_portfolio')
        .update({ status_implantacao: 'IMPLANTADO' })
        .eq('project_id', projectId);

      if (error) throw error;

      console.log('Customer status updated to IMPLANTADO for project:', projectId);
      return true;
    } catch (error) {
      console.error('Error updating customer status:', error);
      return false;
    }
  };

  // Create maintenance audit call when entering assisted operation
  const createAuditChamadoOnAssistedOperation = async (
    projectId: string,
    customerName: string,
    contrato: string,
    praca?: string
  ) => {
    try {
      // Get customer_id from project
      const { data: customer } = await supabase
        .from('customer_portfolio')
        .select('id')
        .eq('project_id', projectId)
        .single();

      // Create audit chamado
      const { error: chamadoError } = await supabase
        .from('manutencao_chamados')
        .insert({
          customer_id: customer?.id || null,
          contrato: contrato || `TEMP-${projectId.slice(0, 8)}`,
          razao_social: customerName,
          tipo: 'PREVENTIVO',
          descricao: 'Auditoria da obra - Verificar instalação e criar agenda de manutenções preventivas',
          data_agendada: new Date().toISOString().split('T')[0],
          is_auditoria: true,
          praca: praca || null,
          historico: [{
            data: new Date().toISOString(),
            acao: 'Chamado de auditoria criado automaticamente ao entrar em operação assistida',
            usuario: user?.nome || 'Sistema',
          }],
          created_by: user?.id,
          created_by_name: user?.nome,
        });

      if (chamadoError) throw chamadoError;

      // Get supervisors for the praca
      const { data: supervisors } = await supabase
        .from('profiles')
        .select('id, nome')
        .or(`filial.eq.${praca},filiais.cs.{${praca}}`);

      // Get supervisor_operacoes users
      const { data: supervisorRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'supervisor_operacoes');

      const supervisorUserIds = supervisorRoles?.map(r => r.user_id) || [];

      // Create notifications for supervisors
      if (supervisorUserIds.length > 0) {
        const notifications = supervisorUserIds.map(userId => ({
          tipo: 'AUDITORIA_OBRA',
          titulo: 'Nova Auditoria de Obra',
          mensagem: `O cliente ${customerName} entrou em operação assistida. É necessário realizar auditoria da obra e criar agenda de manutenções preventivas.`,
          for_user_id: userId,
          for_role: 'supervisor_operacoes',
        }));

        await supabase
          .from('manutencao_notificacoes')
          .insert(notifications);
      }

      // Also notify administrativo role
      await supabase
        .from('manutencao_notificacoes')
        .insert({
          tipo: 'AUDITORIA_OBRA',
          titulo: 'Nova Auditoria de Obra',
          mensagem: `O cliente ${customerName} entrou em operação assistida. Chamado de auditoria criado.`,
          for_role: 'administrativo',
        });

      toast({
        title: 'Chamado de Auditoria Criado',
        description: 'Foi criado um chamado para a manutenção realizar auditoria da obra.',
      });

      return true;
    } catch (error) {
      console.error('Error creating audit chamado:', error);
      toast({
        title: 'Aviso',
        description: 'Não foi possível criar o chamado de auditoria automaticamente.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Determine preventive frequency based on unit count (ticket)
  const getFrequenciaByUnidades = (unidades: number): string => {
    if (unidades >= 15) return 'MENSAL';
    if (unidades >= 8) return 'BIMESTRAL';
    if (unidades >= 4) return 'TRIMESTRAL';
    return 'QUADRIMESTRAL';
  };

  // Calculate next execution date based on frequency
  const calcProximaExecucao = (frequencia: string): string => {
    const now = new Date();
    switch (frequencia) {
      case 'MENSAL': now.setMonth(now.getMonth() + 1); break;
      case 'BIMESTRAL': now.setMonth(now.getMonth() + 2); break;
      case 'TRIMESTRAL': now.setMonth(now.getMonth() + 3); break;
      case 'QUADRIMESTRAL': now.setMonth(now.getMonth() + 4); break;
      default: now.setMonth(now.getMonth() + 3);
    }
    return now.toISOString().split('T')[0];
  };

  // Auto-create preventive agenda when Etapa 6 (Ativação) is completed
  const createPreventivaOnActivation = async (
    projectId: string,
    customerName: string,
    contrato: string,
    unidades: number,
    praca?: string,
    equipamentos?: string,
  ) => {
    try {
      // Get customer_id from project
      const { data: customer } = await supabase
        .from('customer_portfolio')
        .select('id, supervisor_responsavel_id')
        .eq('project_id', projectId)
        .single();

      if (!customer) {
        console.error('Customer not found for project:', projectId);
        return false;
      }

      // Check if agenda already exists for this customer
      const { data: existingAgenda } = await supabase
        .from('manutencao_agendas_preventivas')
        .select('id')
        .eq('customer_id', customer.id)
        .limit(1);

      if (existingAgenda && existingAgenda.length > 0) {
        console.log('Preventive agenda already exists for customer:', customer.id);
        return true;
      }

      const frequencia = getFrequenciaByUnidades(unidades);
      const proximaExecucao = calcProximaExecucao(frequencia);

      // Get supervisor name if available
      let supervisorNome: string | null = null;
      if (customer.supervisor_responsavel_id) {
        const { data: supervisor } = await supabase
          .from('profiles')
          .select('nome')
          .eq('id', customer.supervisor_responsavel_id)
          .single();
        supervisorNome = supervisor?.nome || null;
      }

      const { error } = await supabase
        .from('manutencao_agendas_preventivas')
        .insert({
          customer_id: customer.id,
          contrato,
          razao_social: customerName,
          descricao: `Manutenção Preventiva - ${unidades} unidades (${frequencia.toLowerCase()})`,
          frequencia: frequencia as any,
          proxima_execucao: proximaExecucao,
          praca: praca || null,
          equipamentos: equipamentos || null,
          supervisor_responsavel_id: customer.supervisor_responsavel_id || null,
          supervisor_responsavel_nome: supervisorNome,
          created_by: user?.id,
          created_by_name: user?.nome,
        });

      if (error) throw error;

      toast({
        title: 'Agenda Preventiva Criada',
        description: `Frequência ${frequencia.toLowerCase()} definida automaticamente (${unidades} unidades).`,
      });

      return true;
    } catch (error) {
      console.error('Error creating preventiva on activation:', error);
      toast({
        title: 'Aviso',
        description: 'Não foi possível criar a agenda preventiva automaticamente.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    createCustomerOnStart,
    updateCustomerOnComplete,
    createAuditChamadoOnAssistedOperation,
    createPreventivaOnActivation,
  };
}
