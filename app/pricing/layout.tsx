import { Providers } from "../(app)/Providers";

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
