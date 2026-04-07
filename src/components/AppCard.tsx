"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";

function AppCard(props: React.ComponentProps<typeof Card>) {
  return <Card {...props} />;
}

function AppCardHeader(props: React.ComponentProps<typeof CardHeader>) {
  return <CardHeader {...props} />;
}

function AppCardContent(props: React.ComponentProps<typeof CardContent>) {
  return <CardContent {...props} />;
}

export { AppCard, AppCardHeader, AppCardContent };
