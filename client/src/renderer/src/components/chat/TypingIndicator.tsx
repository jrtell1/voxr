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
      <span>{text}</span>
      <span className="flex gap-0.5 items-end pb-0.5">
        <span className="size-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
        <span className="size-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
        <span className="size-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
      </span>
    </div>
  );
}
