import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';

type IconProps = {
  ios: SFSymbol;
  android: AndroidSymbol;
  color: string;
  size?: number;
};

export function Icon({ ios, android, color, size = 22 }: IconProps) {
  return (
    <SymbolView
      name={{ ios, android, web: android }}
      tintColor={color}
      size={size}
    />
  );
}
