import { getSiteUrl } from "@/lib/site";
import { blikPhoneToE164 } from "@/lib/app-settings";

type Props = {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  blikPhone: string;
  logoUrl: string;
};

export function SiteJsonLd({ siteName, siteDescription, contactEmail, blikPhone, logoUrl }: Props) {
  const url = getSiteUrl();
  const logoAbsolute = logoUrl.startsWith("http") ? logoUrl : `${url}${logoUrl.startsWith("/") ? "" : "/"}${logoUrl}`;
  const phoneE164 = blikPhoneToE164(blikPhone);

  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebSite",
      "@id": `${url}/#website`,
      url,
      name: siteName,
      description: siteDescription,
      inLanguage: "pl-PL",
      publisher: { "@id": `${url}/#organization` },
    },
    {
      "@type": "SportsOrganization",
      "@id": `${url}/#organization`,
      name: siteName,
      url,
      logo: { "@type": "ImageObject", url: logoAbsolute },
      description: siteDescription,
      email: contactEmail,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: contactEmail,
        telephone: phoneE164,
        areaServed: "PL",
        availableLanguage: "pl",
      },
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
