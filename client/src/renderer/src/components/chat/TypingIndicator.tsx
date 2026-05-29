interface Props {
  names: string[];
}

export default function TypingIndicator({ names }: Props) {
  if (names.length === 0) return <div className="h-5" />;

  let text: string;
  if (names.length === 1) text = `${names[0]} is typing`;
  else if (names.length === 2) text = `${names[0]} and ${names[1]} are typing`;
  else text = 'Several people are typing';

  return (
    <div className="h-5 flex items-end gap-1.5 px-4 text-xs text-muted-foreground select-none pb-1">
      {text}...
    </div>
  );
}
