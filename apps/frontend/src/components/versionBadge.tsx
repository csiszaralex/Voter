import { useEffect, useState } from 'react';

export const VersionBadge = () => {
  const [backendVersion, setBackendVersion] = useState<string>('loading...');
  const frontendVersion = import.meta.env.VITE_APP_VERSION || '0.0.0-dev';

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_SOCKET_URL || '';
    const finalUrl = baseUrl === '/' ? '' : baseUrl;
    fetch(`${finalUrl}/health/version`)
      .then((res) => res.json())
      .then((data) => setBackendVersion(data.version))
      .catch(() => setBackendVersion('offline'));
  }, []);

  return (
    <div className='fixed bottom-2 right-2 flex gap-2 text-[10px] font-mono opacity-50 hover:opacity-100 transition-opacity'>
      <span className='bg-slate-800 text-slate-300 px-2 py-1 rounded'>UI: v{frontendVersion}</span>
      <span className='bg-slate-800 text-slate-300 px-2 py-1 rounded'>API: v{backendVersion}</span>
    </div>
  );
};
