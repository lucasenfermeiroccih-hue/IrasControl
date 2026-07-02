import { useEffect, useMemo, useRef, useState } from 'react';
import { getMyPermissions } from '@/services/permissionsService';

export function usePermissions(hospitalId?: string) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  async function load() {
    if (!hospitalId) {
      setPermissions([]);
      setLoading(false);
      return;
    }
    const current = ++reqId.current;
    setLoading(true);
    try {
      const data = await getMyPermissions(hospitalId);
      if (current === reqId.current) setPermissions(data);
    } finally {
      if (current === reqId.current) setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [hospitalId]);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const can = (p: string) => permissionSet.has(p);
  const canAny = (l: string[]) => l.some((p) => permissionSet.has(p));
  const canAll = (l: string[]) => l.every((p) => permissionSet.has(p));

  return { permissions, loading, can, canAny, canAll, reload: load };
}
