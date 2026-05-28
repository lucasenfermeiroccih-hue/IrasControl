import { useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useHospitalEmployees } from "@/hooks/useHospitalEmployees";

interface EmployeeComboboxProps {
  hospitalId: string | null;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function EmployeeCombobox({ hospitalId, value, onChange, placeholder = "Selecione o funcionário" }: EmployeeComboboxProps) {
  const [open, setOpen] = useState(false);
  const { employees, loading } = useHospitalEmployees(hospitalId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-10 px-3"
        >
          <span className="truncate">{value || placeholder}</span>
          {loading
            ? <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
            : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar funcionário..." />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : (
              <>
                <CommandEmpty>Nenhum funcionário encontrado.</CommandEmpty>
                <CommandGroup>
                  {employees.map(emp => (
                    <CommandItem
                      key={emp}
                      value={emp}
                      onSelect={() => {
                        onChange(emp === value ? "" : emp);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", value === emp ? "opacity-100" : "opacity-0")} />
                      {emp}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
