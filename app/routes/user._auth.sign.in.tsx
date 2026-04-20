/* eslint-disable jsx-a11y/tabindex-no-positive */
import type { Route } from "./+types/user._auth.sign.in";
import {
  Form,
  Link,
  redirect,
  useSearchParams,
  useLocation,
  useNavigation,
} from "react-router";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { LoaderCircle } from "lucide-react";

import { FormField } from "~/components/form-field";
import GoogleIcon from "~/components/icons/google-login";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { login, getUser, googleLoginIsConfigured } from "~/lib/auth.server";

import { LoginSchema as schema } from "~/lib/schemas";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  return await login(formData); // also handles validation and error responses
}

export async function loader({ request }: Route.LoaderArgs) {
  // If there's already a user in the session, redirect to the home page
  const user = await getUser(request);
  if (user) return redirect("/");
  const auth = {
    email: true,
    google: googleLoginIsConfigured,
  };
  return { auth };
}

export default function UserSignIn({
  actionData,
  loaderData,
}: Route.ComponentProps) {
  const location = useLocation();
  const navigation = useNavigation();
  const [searchParams /*, setSearchParams*/] = useSearchParams();
  const paramEmail = searchParams.get("email");

  const email =
    actionData?.initialValue?.email ||
    location.state?.email ||
    paramEmail ||
    "";

  const [form, fields] = useForm({
    lastResult: actionData,
    constraint: getZodConstraint(schema),
    defaultValue: { email },
    shouldRevalidate: "onInput",
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema,
      });
    },
  });

  const isSubmitting = navigation.formAction === "/user/sign/in";

  return (
    <Card className="mx-auto w-full max-w-sm shadow-none border-none bg-transparent">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Giriş Yap</CardTitle>
        <CardDescription className="text-center text-balance">
          Hesabına giriş yapmak ve sertifikalarına erişmek için aşağıya
          e-postanı ve parolanı gir.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        <Form method="POST" {...getFormProps(form)} className="grid gap-4">
          {form.errors && (
            <div
              id={form.errorId}
              className="w-full font-semibold text-sm tracking-wide text-red-500 border border-red-500 rounded p-2 flex flex-col justify-center items-center gap-2"
            >
              {form.errors}
            </div>
          )}
          <FormField
            {...getInputProps(fields.email, { type: "email" })}
            label="E-posta"
            error={fields.email.errors?.join(", ")}
            tabIndex={1}
          />
          <FormField
            {...getInputProps(fields.password, { type: "password" })}
            label="Parola"
            error={fields.password.errors?.join(", ")}
            tabIndex={2}
            hint={
              <Link
                to="/user/forgot-password"
                className="ml-auto inline-block text-sm underline"
                tabIndex={4}
                state={fields.email.value !== "" ? { email: fields.email.value } : undefined}
              >
                Parolanı mı unuttun?
              </Link>
            }
          />

          <Button
            type="submit"
            className="w-full"
            tabIndex={3}
            disabled={isSubmitting}
          >
            {isSubmitting && <LoaderCircle className="mr-2 animate-spin" />}
            Giriş Yap
          </Button>

          {actionData?.error?.["verify-email"] && (
            <div className="w-full font-semibold text-sm bg-red-500/10 text-red-500 border border-red-500 rounded p-2 flex flex-col justify-center items-center gap-2">
              {actionData?.error?.["verify-email"]}
              <Form
                action="/user/verification/resend"
                method="POST"
                className="text-foreground"
              >
                <input
                  type="hidden"
                  name="email"
                  value={actionData.initialValue?.email.toString()}
                />
                <Button variant="outline" size="sm" type="submit">
                  E-postayı tekrar gönder
                </Button>
              </Form>
            </div>
          )}

          <div className="mt-4 text-center text-sm">
            Hesabın yok mu?
            <Button
              type="button"
              variant="link"
              className="underline"
              tabIndex={5}
              asChild
            >
              <Link
                to={"/user/sign/up" /* @todo add supportfor redirectTo */}
                state={fields.email.value !== "" ? { email: fields.email.value } : undefined}
              >
                Kayıt Ol
              </Link>
            </Button>
          </div>
        </Form>
        {loaderData.auth.google && (
          <>
            <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
              <span className="bg-muted text-muted-foreground relative z-10 px-2">
                veya
              </span>
            </div>
            <Form action="/auth/google" method="GET">
              <Button variant="outline" className="w-full">
                <GoogleIcon />
                Google ile devam et
              </Button>
            </Form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
