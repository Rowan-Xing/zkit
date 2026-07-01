import { StyleSheet } from 'react-native';
import { wp } from 'zkit-tools';

export const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(17, 24, 39, 0.68)',
    borderRadius: wp(7),
    bottom: wp(18),
    left: wp(18),
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
  eyebrow: {
    fontSize: wp(12),
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: wp(16),
    textTransform: 'uppercase',
  },
  header: {
    gap: wp(8),
    marginBottom: wp(18),
  },
  image: {
    borderRadius: wp(8),
  },
  imageContainer: {
    paddingHorizontal: wp(8),
    paddingVertical: wp(8),
    position: 'relative',
  },
  messageList: {
    gap: wp(8),
  },
  messageRow: {
    width: '100%',
  },
  messageRowOther: {
    alignItems: 'flex-start',
  },
  messageRowSelf: {
    alignItems: 'flex-end',
  },
  playBadge: {
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
    borderRadius: wp(7),
    left: wp(18),
    paddingHorizontal: wp(8),
    paddingVertical: wp(6),
    position: 'absolute',
    top: wp(18),
  },
  playBadgeText: {
    color: '#FFFFFF',
    fontSize: wp(11),
    fontWeight: '900',
    lineHeight: wp(12),
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
