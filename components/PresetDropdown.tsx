import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Props {
  selected: string,
  setSelected: Function,
  options: Object, 
}

export function PresetDropdown({selected, setSelected, options}: Props) {
  function updateSelected(selected: string): void{
    setSelected(selected);
  }

  return(
    <Select defaultValue={selected} onValueChange={updateSelected}>
      <SelectTrigger className="w-[180px]">
        <SelectValue  placeholder={selected} />
      </SelectTrigger>

      <SelectContent>
        {Object.entries(options).map(([key, value]) => <SelectItem key={key} value={value}>{value}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}