import React, { useState } from 'react';

export function ReportAgencyBrand({ name, logo }: { name?: string; logo?: string }) {
  const [failedUrl, setFailedUrl] = useState('');
  const hasLogo = Boolean(logo && logo !== failedUrl);
  if (!hasLogo && !name) return <div className="report-agency-placeholder report-screen-only">Logo de tu agencia</div>;
  return <div className={'report-agency-brand' + (hasLogo ? ' has-logo' : '') + (!name ? ' logo-only' : '')}>
    {hasLogo && <img src={logo} alt={name ? `Logo de ${name}` : 'Logo de la agencia'} referrerPolicy="no-referrer" onError={() => setFailedUrl(logo || '')} />}
    {name && <div className="report-agency-name"><span>Preparado por</span><strong>{name}</strong></div>}
  </div>;
}
