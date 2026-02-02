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

  return {
    createCustomerOnStart,
    updateCustomerOnComplete,
    createAuditChamadoOnAssistedOperation,
  };
}
