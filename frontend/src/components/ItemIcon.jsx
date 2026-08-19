import {
  Scroll, ScrollText, BookOpen, Gem, Ticket, Sparkles, Flame, Sun, Wrench,
  Anvil, Hammer, Coins, Sword, Shield, Sparkle,
} from "lucide-react";

// Maps the backend's `item.icon` string to a lucide component so new
// materials render correctly everywhere without per-screen switch blocks.
const ICONS = {
  scroll: Scroll, "scroll-text": ScrollText, "book-open": BookOpen, gem: Gem,
  ticket: Ticket, sparkles: Sparkles, sparkle: Sparkle, flame: Flame, sun: Sun,
  wrench: Wrench, anvil: Anvil, hammer: Hammer, coins: Coins, sword: Sword, shield: Shield,
};

export const ItemIcon = ({ icon, className = "w-4 h-4", style }) => {
  const Cmp = ICONS[icon] || Sparkles;
  return <Cmp className={className} style={style} />;
};
