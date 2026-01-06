import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, AlertCircle, CheckCircle, Lock } from 'lucide-react';

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return 'A senha deve ter pelo menos 6 caracteres';
    }
    if (password === '123456') {
      return 'Escolha uma senha diferente da senha inicial';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    // Validate password strength
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const success = await changePassword(newPassword);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Erro ao alterar senha. Tente novamente.');
      }
    } catch {
      setError('Erro ao alterar senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-soft">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Projetos</h1>
          <p className="text-muted-foreground">Portaria Digital</p>
        </div>

        <Card className="shadow-soft border-border">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-status-pending-bg rounded-full">
                <Lock className="w-6 h-6 text-status-pending" />
              </div>
            </div>
            <CardTitle className="text-xl">Alteração de Senha Obrigatória</CardTitle>
            <CardDescription>
              Olá, <span className="font-medium">{user?.nome}</span>! Por segurança, você precisa criar uma nova senha antes de continuar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Digite sua nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Digite novamente a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {/* Password requirements */}
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-xs font-medium text-secondary-foreground mb-2">Requisitos da senha:</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className={`w-3 h-3 ${newPassword.length >= 6 ? 'text-status-approved' : 'text-muted-foreground'}`} />
                    <span className={newPassword.length >= 6 ? 'text-status-approved' : 'text-muted-foreground'}>
                      Mínimo 6 caracteres
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className={`w-3 h-3 ${newPassword && newPassword !== '123456' ? 'text-status-approved' : 'text-muted-foreground'}`} />
                    <span className={newPassword && newPassword !== '123456' ? 'text-status-approved' : 'text-muted-foreground'}>
                      Diferente da senha inicial
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className={`w-3 h-3 ${confirmPassword && newPassword === confirmPassword ? 'text-status-approved' : 'text-muted-foreground'}`} />
                    <span className={confirmPassword && newPassword === confirmPassword ? 'text-status-approved' : 'text-muted-foreground'}>
                      Senhas coincidem
                    </span>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Alterando...' : 'Alterar Senha e Continuar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
