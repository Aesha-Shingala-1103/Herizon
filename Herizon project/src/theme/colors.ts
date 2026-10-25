/**
 * HERHEALTH FLORAL DESIGN SYSTEM
 * Official 5-Color Floral Palette extracted directly from the Cherry Blossom Reference:
 * 
 * 1. Soft Lavender Mist:      #D9DAE4
 * 2. Dusty Blue:              #91A0BD
 * 3. Muted Lavender Slate:    #545774
 * 4. Cherry Blossom Rose:     #DBA1A5
 * 5. Deep Blossom Burgundy:   #853D4D
 * 
 * Supporting Neutrals:
 * - Warm Porcelain:           #FBF8F7
 * - Soft White:               #FFFFFF
 * - Muted Text:               #777681
 * - Fine Border:              #E9E3E7
 * - Pale Rose-White:          #F8ECEC
 */

export const Colors = {
  // --- The Exact 5-Color Floral Palette ---
  softLavender: '#D9DAE4',     // Color 1: Soft Lavender Mist
  softLavenderMist: '#D9DAE4', // Color 1 Alias
  dustyBlue: '#91A0BD',        // Color 2: Dusty Blue
  lavenderSlate: '#545774',    // Color 3: Muted Lavender Slate
  blossomRose: '#DBA1A5',      // Color 4: Cherry Blossom Rose
  deepBurgundy: '#853D4D',     // Color 5: Deep Blossom Burgundy

  // --- Supporting Neutrals ---
  warmPorcelain: '#FBF8F7',
  softWhite: '#FFFFFF',
  white: '#FFFFFF',
  mutedText: '#777681',
  fineBorder: '#E9E3E7',
  paleRoseWhite: '#F8ECEC',

  // --- Glassmorphism Surfaces ---
  glassCard: 'rgba(255, 255, 255, 0.78)',
  glassCardSubtle: 'rgba(251, 248, 247, 0.85)',
  glassLavender: 'rgba(217, 218, 228, 0.42)',
  glassRose: 'rgba(219, 161, 165, 0.18)',
  glassDustyBlue: 'rgba(145, 160, 189, 0.16)',
  glassBurgundy: 'rgba(133, 61, 77, 0.10)',
  glassBorder: 'rgba(255, 255, 255, 0.75)',
  glassBorderSubtle: 'rgba(233, 227, 231, 0.85)',

  // --- Primary Semantic Aliases (Feminine Floral Healthcare) ---
  primary: '#853D4D',          // Deep Blossom Burgundy
  primaryHover: '#6E323F',
  accent: '#DBA1A5',           // Cherry Blossom Rose
  secondary: '#91A0BD',        // Dusty Blue
  textPrimary: '#545774',      // Muted Lavender Slate
  textSecondary: '#777681',    // Muted text
  textMuted: '#91A0BD',        // Dusty blue muted
  textInverse: '#FFFFFF',
  background: '#FBF8F7',       // Warm Porcelain
  card: '#FFFFFF',
  border: '#E9E3E7',

  // --- Legacy Compatibility Mappings (Seamless upgrade from previous system) ---
  deepTeal: '#853D4D',         // Upgraded to Deep Blossom Burgundy
  primaryTeal: '#545774',      // Upgraded to Muted Lavender Slate
  lightTeal: '#DBA1A5',        // Upgraded to Cherry Blossom Rose
  softMint: '#D9DAE4',         // Upgraded to Soft Lavender Mist
  mintTint: '#F8ECEC',         // Upgraded to Pale Rose-White
  deepNavy: '#545774',         // Upgraded to Muted Lavender Slate
  warmCream: '#FBF8F7',        // Upgraded to Warm Porcelain
  surfaceLight: '#FFFFFF',
  surfaceCard: 'rgba(255, 255, 255, 0.88)',
  surfaceSubtle: '#F8ECEC',    // Upgraded to Pale Rose-White
  borderSubtle: '#E9E3E7',     // Upgraded to Fine Border
  borderLight: '#F0EAEF',

  // --- Health Status & Alerts (Restrained & Clinically Grounded) ---
  urgentRed: '#853D4D',        // Cohesive Deep Blossom Burgundy for urgent actions
  urgentRedBg: '#F8ECEC',
  urgentRedBorder: '#DBA1A5',

  attentionAmber: '#91A0BD',   // Dusty Blue attention badge
  attentionAmberBg: '#D9DAE4',
  attentionAmberBorder: '#91A0BD',

  successGreen: '#545774',     // Muted Lavender Slate confirmation
  successGreenBg: '#D9DAE4',
  successGreenBorder: '#91A0BD',

  infoBlue: '#91A0BD',
  infoBlueBg: '#D9DAE4',
  infoBlueBorder: '#91A0BD',

  shadowColor: '#545774',
} as const;

export default Colors;
