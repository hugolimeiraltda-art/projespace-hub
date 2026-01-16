import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Building2, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilialMultiSelectProps {
  filiais: string[];
  selectedFiliais: string[];
  onSelectionChange: (filiais: string[]) => void;
  className?: string;
}

export function FilialMultiSelect({
  filiais,
  selectedFiliais,
  onSelectionChange,
  className,
}: FilialMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const uniqueFiliais = useMemo(() => {
    const unique = [...new Set(filiais.filter(f => f && f.trim() !== ''))];
    return unique.sort();
  }, [filiais]);

  const handleToggle = (filial: string) => {
    if (selectedFiliais.includes(filial)) {
      onSelectionChange(selectedFiliais.filter(f => f !== filial));
    } else {
      onSelectionChange([...selectedFiliais, filial]);
    }
  };

  const handleClear = () => {
    onSelectionChange([]);
  };

  const handleSelectAll = () => {
    onSelectionChange(uniqueFiliais);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="min-w-[180px] justify-between"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              {selectedFiliais.length === 0 ? (
                <span className="text-muted-foreground">Filtrar por filial</span>
              ) : selectedFiliais.length === 1 ? (
                <span>{selectedFiliais[0]}</span>
              ) : (
                <span>{selectedFiliais.length} filiais</span>
              )}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          <div className="p-2 border-b flex justify-between gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7 px-2"
              onClick={handleSelectAll}
            >
              Selecionar todos
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7 px-2"
              onClick={handleClear}
            >
              Limpar
            </Button>
          </div>
          <div className="max-h-[200px] overflow-y-auto p-2">
            {uniqueFiliais.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                Nenhuma filial encontrada
              </p>
            ) : (
              uniqueFiliais.map((filial) => (
                <div
                  key={filial}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-muted cursor-pointer"
                  onClick={() => handleToggle(filial)}
                >
                  <Checkbox
                    checked={selectedFiliais.includes(filial)}
                    onCheckedChange={() => handleToggle(filial)}
                  />
                  <span className="text-sm">{filial}</span>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedFiliais.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedFiliais.slice(0, 3).map((filial) => (
            <Badge
              key={filial}
              variant="secondary"
              className="text-xs cursor-pointer"
              onClick={() => handleToggle(filial)}
            >
              {filial}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
          {selectedFiliais.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{selectedFiliais.length - 3}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
