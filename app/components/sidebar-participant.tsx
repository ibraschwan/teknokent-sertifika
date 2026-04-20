import type {
  CertificatesWithBatchAndProgram,
  UserAuthenticated,
} from "~/lib/types";

import { Link, NavLink, useLocation } from "react-router";
import { ChevronsUpDown, LogOut, SquareUser, TowerControl } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";

import { pickCapitalLetters } from "~/lib/utils";

export function SidebarParticipant({
  user,
  certificates,
}: {
  user: UserAuthenticated;
  certificates: CertificatesWithBatchAndProgram[];
}) {
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="duration-200 transition-all flex mt-2 pl-4 group-data-[collapsible=icon]:mt-1 group-data-[collapsible=icon]:pl-3">
        <Link
          to="/"
          className="duration-200 transition-all flex items-center shrink-0 gap-1 text-black group-data-[collapsible=icon]:size-6"
        >
          <img src={`/logo/org.svg`} alt="Logo" className="size-6" />

          <span className="duration-200 transition-[width] w-30 overflow-hidden text-xl font-bold group-data-[collapsible=icon]:w-0">
            Sertifikalar
          </span>
          <span className="sr-only">Sertifikalar</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="duration-200 group-data-[collapsible=icon]:px-0">
          <SidebarGroupLabel>Sertifikaların</SidebarGroupLabel>
          <SidebarMenu>
            {certificates.map((cert) => (
              <SidebarMenuItem key={cert.id}>
                <SidebarMenuButton
                  tooltip={`${cert.batch.program.name} – ${cert.batch.name}`}
                  asChild
                  className="aria-[current]:bg-accent aria-[current]:font-bold !h-9 group-data-[collapsible=icon]:w-10"
                >
                  <NavLink to={`/view/${cert.uuid}`}>
                    {cert.batch.program.logo ? (
                      <div className="flex size-8 aspect-square items-center justify-center rounded-lg bg-white">
                        <img
                          src={`/logo/program/${cert.batch.program.logo.uuid}.svg`}
                          alt={cert.batch.program.name}
                          className="w-5 aspect-square"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <b>{pickCapitalLetters(cert.batch.program.name)}</b>
                      </div>
                    )}
                    <span>{cert.batch.name}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {user.isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Yönetim" asChild>
                <NavLink
                  to="/org/program"
                  className="aria-[current]:bg-sidebar-accent aria-[current]:font-bold"
                >
                  <TowerControl />
                  <span>Yönetim</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded">
                    <AvatarImage
                      src="/user/photo/preview.png"
                      alt={user.firstName}
                    />
                    <AvatarFallback className="rounded-lg">{`${user.firstName.charAt(
                      0,
                    )}${user.lastName.charAt(0)}`}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user.firstName}
                    </span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-60 rounded-lg"
                side="top"
                align="start"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded">
                      <AvatarImage
                        src="/user/photo/preview.png"
                        alt={user.firstName}
                      />
                      <AvatarFallback className="rounded-lg">{`${user.firstName.charAt(
                        0,
                      )}${user.lastName.charAt(0)}`}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="truncate text-xs">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link to="/user/photo" state={{ fromPath: pathname }}>
                      <SquareUser className="ml-0.5 mr-3.5 w-5 h-5" />
                      Hesap Ayarları
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <form
                    action="/user/sign/out"
                    method="POST"
                    className="flex grow"
                  >
                    <button type="submit" className="flex grow">
                      <LogOut className="ml-0.5 mr-3.5 w-5 h-5" />
                      Çıkış Yap
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
