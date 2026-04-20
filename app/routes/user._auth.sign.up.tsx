import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import type { Route } from "./+types/user._auth.sign.up";
import {
  Form,
  Link,
  redirect,
  useSearchParams,
  useLocation,
  useNavigation,
} from "react-router";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { LoaderCircle } from "lucide-react";

import { FormField } from "~/components/form-field";
import {
  assessPassword,
  PasswordIndicator,
  type PasswordAssessment,
} from "~/components/password-indicator";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";

import { register, getUser } from "~/lib/auth.server";
import { RegisterSchema as schema } from "~/lib/schemas";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  return await register(formData); // also handles validation and errors
}

export async function loader({ request }: Route.LoaderArgs) {
  // If there's already a user in the session, redirect to the home page
  const user = await getUser(request);
  if (user) return redirect("/");
  return null;
}

export default function UserSignUp({ actionData }: Route.ComponentProps) {
  const location = useLocation();
  const navigation = useNavigation();
  const [searchParams /*, setSearchParams*/] = useSearchParams();
  const paramEmail = searchParams.get("email");
  const paramFirstName = searchParams.get("firstName");
  const paramLastName = searchParams.get("lastName");

  const email =
    actionData?.initialValue?.email.toString() ||
    location.state?.email ||
    paramEmail ||
    "";
  const firstName =
    actionData?.initialValue?.firstName.toString() || paramFirstName || "";
  const lastName =
    actionData?.initialValue?.lastName.toString() || paramLastName || "";

  const [form, fields] = useForm({
    lastResult: actionData,
    constraint: getZodConstraint(schema),
    defaultValue: { email, firstName, lastName },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema,
      });
    },
  });

  let passwordStrength: PasswordAssessment | undefined = undefined;
  if (fields.password.value && fields.password.value !== "") {
    passwordStrength = assessPassword(fields.password.value);
  }

  const isSubmitting = navigation.formAction === "/user/sign/up";

  return (
    <Card className="mx-auto w-full max-w-sm shadow-none border-none bg-transparent">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Kayıt Ol</CardTitle>
        <CardDescription className="text-center text-balance">
          Bir hesap oluşturmak ve sertifikalarına erişmek için adını,
          e-postanı ve bir parola gir.
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
          />
          <FormField
            {...getInputProps(fields.password, { type: "password" })}
            label="Parola"
            error={fields.password.errors?.join(", ")}
          />
          <Label>Parola gücü</Label>
          <PasswordIndicator passwordStrength={passwordStrength?.result} />

          <FormField
            {...getInputProps(fields.firstName, { type: "text" })}
            label="Ad"
            error={fields.firstName.errors?.join(", ")}
          />
          <FormField
            {...getInputProps(fields.lastName, { type: "text" })}
            label="Soyad"
            error={fields.lastName.errors?.join(", ")}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle className="mr-2 animate-spin" />}
            Kayıt Ol
          </Button>

          <div className="mt-4 text-center text-sm">
            Zaten hesabın var mı?
            <Button type="button" variant="link" className="underline">
              <Link
                to={"/user/sign/in" /* @todo add supportfor redirectTo */}
                state={
                  fields.email.value !== ""
                    ? { email: fields.email.value }
                    : undefined
                }
              >
                Giriş Yap
              </Link>
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
