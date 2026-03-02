import { PageHeader } from '../components/page-header';
import { Card, CardBody, CardHeader } from '../components/card';
import { Input } from '../components/input';
import { Button } from '../components/button';

export function LoginRoute() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Access"
        title="Sign in"
        subtitle="Use email or continue with Google for the demo."
      />

      <Card className="max-w-xl">
        <CardHeader>
          <h2 className="font-display text-2xl">Welcome back</h2>
        </CardHeader>
        <CardBody className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="login-email" className="text-sm text-ink/70">
              Email
            </label>
            <Input
              id="login-email"
              type="email"
              placeholder="you@coastaleats.com"
            />
          </div>
          <Button>Continue with email</Button>
          <div className="flex items-center gap-3 text-xs text-ink/50">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <Button variant="outline">Continue with Google</Button>
        </CardBody>
      </Card>
    </div>
  );
}
