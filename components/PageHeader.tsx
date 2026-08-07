import { Icon, IconName } from "./Icon";

export type PageIcon = IconName;

export function PageHeader({ icon, title }: { icon: PageIcon; title: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b-2 border-gold pb-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-pitch text-gold">
        <Icon name={icon} size={16} />
      </div>
      <h1 className="font-display text-base font-semibold sm:text-lg">{title}</h1>
    </div>
  );
}
