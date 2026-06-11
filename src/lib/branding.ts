// Central place for product branding so a rename is a one-file change.
export const branding = {
  productName: process.env.NEXT_PUBLIC_PRODUCT_NAME ?? "CampaignDesk",
  tagline: "Run your agency's entire service activity in one place.",
} as const;
