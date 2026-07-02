import { ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { usePermissions } from '@/hooks/usePermissions';

interface Props {
  hospitalId: string;
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({ hospitalId, permission, children, fallback }: Props) {
  const { loading, can } = usePermissions(hospitalId);

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!can(permission)) {
    return (
      fallback || (
        <div className="p-6">
          <Card className="border-red-200">
            <CardContent className="py-10 text-center space-y-3">
              <AlertTriangle className="mx-auto h-10 w-10 text-red-600" />
              <h2 className="text-xl font-semibold">Acesso não autorizado</h2>
              <p className="text-muted-foreground">
                Você não possui permissão para acessar esta página ou ferramenta.
              </p>
            </CardContent>
          </Card>
        </div>
      )
    );
  }

  return <>{children}</>;
}
