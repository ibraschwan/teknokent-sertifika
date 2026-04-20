import type { Route as RootRoute } from "../+types/root";
import { useSearchParams, Outlet, useRouteLoaderData } from "react-router";
import { CheckIcon } from "lucide-react";
import { useIsMobile } from "~/hooks/use-mobile";

export default function UserBalloons() {
  const { org } =
    useRouteLoaderData<RootRoute.ComponentProps["loaderData"]>("root") ?? {};
  const [searchParams /*, setSearchParams*/] = useSearchParams();
  const isMobile = useIsMobile();

  return (
    <div className="h-screen grid grid-cols-2">
      {!isMobile && (
        <div className="relative h-screen bg-zinc-900">
          <div className="absolute top-8 inset-x-8 flex text-white items-center">
            <img
              src={`/logo/org.svg`}
              alt=""
              className="size-12 invert"
              role="presentation"
            />
            &emsp;
            <span className="text-3xl font-bold tracking-wide">
              Sertifikalar
            </span>
          </div>
        </div>
      )}
      <div
        className={`h-screen flex flex-col items-center justify-center px-4 ${
          isMobile ? "col-span-2" : ""
        }`}
      >
        {searchParams.get("verification") === "done" && (
          <div className="absolute top-10 flex mx-8 p-2 px-4 gap-2 rounded-xl bg-green-600 text-primary-foreground">
            <CheckIcon /> E-postanız başarıyla doğrulandı. Artık giriş yapabilirsin.
          </div>
        )}

        {searchParams.get("reset") === "done" && (
          <div className="absolute top-10 flex mx-8 p-2 px-4 gap-2 rounded-xl bg-green-600 text-primary-foreground">
            <CheckIcon /> Parolan değiştirildi. Artık yeni parolanla giriş
            yapabilirsin.
          </div>
        )}

        <div className="grow"></div>
        {isMobile && (
          <>
            <img
              src={`/logo/org.svg`}
              alt=""
              className="size-20 dark:invert"
              role="presentation"
            />
          </>
        )}
        <Outlet />
        <div className="grow flex flex-row justify-center items-end gap-4 pb-5 text-xs">
          {org?.imprintUrl && (
            <a href={org.imprintUrl} target="_blank" rel="noopener noreferrer">
              Künye
            </a>
          )}
          {org?.privacyUrl && (
            <a href={org.privacyUrl} target="_blank" rel="noopener noreferrer">
              Gizlilik
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
