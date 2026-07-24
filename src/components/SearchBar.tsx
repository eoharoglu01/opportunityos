import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function SearchBar({ value, onChange, onSubmit }: SearchBarProps) {
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="flex-1">
        <span className="sr-only">Ürün ara</span>
        <Input value={value} onChange={onChange} placeholder="Ürün ara..." />
      </label>
      <Button type="submit">Fırsatları Keşfet</Button>
    </form>
  );
}
