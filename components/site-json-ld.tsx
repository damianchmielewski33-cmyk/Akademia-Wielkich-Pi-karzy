import { getPublicContactEmail, getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export function SiteJsonLd() {
  const url = getSiteUrl();
  const logoUrl = `${url}/logo-akademia.svg`;
  const email = getPublicContactEmail();

  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebSite",
      "@id": `${url}/#website`,
      url,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "pl-PL",
      publisher: { "@id": `${url}/#organization` },
    },
    {
      "@type": "SportsOrganization",
      "@id": `${url}/#organization`,
      name: SITE_NAME,
      url,
      logo: { "@type": "ImageObject", url: logoUrl },
      description: SITE_DESCRIPTION,
      ...(email ? { email } : {}),
    },
  ];

  const payload = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
