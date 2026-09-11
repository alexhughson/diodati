import type { ThemeId } from "./themes";
import { themes } from "./themes";

type Props = {
  theme: ThemeId;
  onTheme: (id: ThemeId) => void;
};

export function ThemeSwitcher(props: Props) {
  return (
    <div className="theme-list" role="radiogroup" aria-label="color theme">
      {themes.map((theme) => (
        <button
          key={theme.id}
          className={theme.id === props.theme ? "theme-row active" : "theme-row"}
          role="radio"
          aria-checked={theme.id === props.theme}
          onClick={() => props.onTheme(theme.id)}
        >
          <span className={`theme-dot ${theme.id}`} />
          <span>{theme.label}</span>
        </button>
      ))}
    </div>
  );
}
