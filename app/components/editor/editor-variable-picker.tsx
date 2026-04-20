import { useState } from "react";
import { Braces } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  TEMPLATE_VARIABLES,
  VARIABLE_GROUPS,
  variablesByGroup,
  type VariableGroup,
} from "~/lib/template-variables";

export function VariablePicker({
  onInsert,
  size = "sm",
}: {
  onInsert: (token: string) => void;
  size?: "sm" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const groups = variablesByGroup();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={size}
          type="button"
          className="gap-1.5 text-xs"
          title="Değişken ekle"
        >
          <Braces className="size-3.5" />
          {size !== "icon" && "Değişken"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Değişken ara…" />
          <CommandList>
            <CommandEmpty>Eşleşen değişken yok.</CommandEmpty>
            {(Object.keys(groups) as VariableGroup[]).map((group, idx) => (
              <div key={group}>
                {idx > 0 && <CommandSeparator />}
                <CommandGroup heading={VARIABLE_GROUPS[group]}>
                  {groups[group].map((v) => (
                    <CommandItem
                      key={v.token}
                      value={`${v.token} ${v.label} ${v.description}`}
                      onSelect={() => {
                        onInsert(v.token);
                        setOpen(false);
                      }}
                      className="flex flex-col items-start gap-0.5 py-2"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="font-mono text-[11px] text-blue-600">
                          {v.token}
                        </span>
                        <span className="ml-auto text-[11px] text-muted-foreground italic">
                          → {v.example}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {v.description}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function variableTokens() {
  return TEMPLATE_VARIABLES.map((v) => v.token);
}
