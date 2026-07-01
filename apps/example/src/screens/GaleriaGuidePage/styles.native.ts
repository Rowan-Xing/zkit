import { StyleSheet } from 'react-native';
import { wp } from 'zkit-tools';

export const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(17, 24, 39, 0.68)',
    borderRadius: wp(7),
    bottom: wp(10),
    left: wp(10),
    maxWidth: '82%',
    paddingHorizontal: wp(9),
    paddingVertical: wp(7),
    position: 'absolute',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: wp(12),
    fontWeight: '800',
    lineHeight: wp(13),
  },
  card: {
    borderRadius: wp(8),
    height: wp(176),
    overflow: 'hidden',
    width: '48.5%',
  },
  cardTall: {
    height: wp(362),
  },
  eyebrow: {
    fontSize: wp(12),
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: wp(16),
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(10),
  },
  header: {
    gap: wp(8),
    marginBottom: wp(18),
  },
  image: {
    height: '100%',
    width: '100%',
  },
  subtitle: {
    fontSize: wp(14),
    fontWeight: '600',
    lineHeight: wp(22),
  },
  title: {
    fontSize: wp(30),
    fontWeight: '900',
    lineHeight: wp(36),
  },
});
