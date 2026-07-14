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
  apiPanel: {
    borderRadius: wp(8),
    borderWidth: StyleSheet.hairlineWidth,
    gap: wp(8),
    marginBottom: wp(14),
    paddingHorizontal: wp(14),
    paddingVertical: wp(13),
  },
  apiPanelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: wp(10),
    justifyContent: 'space-between',
  },
  apiPanelSubtitle: {
    fontSize: wp(13),
    fontWeight: '600',
    lineHeight: wp(20),
  },
  apiPanelTitle: {
    flex: 1,
    fontSize: wp(13),
    fontWeight: '900',
    lineHeight: wp(18),
  },
  apiPanelValue: {
    fontSize: wp(12),
    fontWeight: '900',
    lineHeight: wp(16),
  },
  activeRing: {
    borderColor: '#FFFFFF',
    borderRadius: wp(8),
    borderWidth: wp(2),
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  galleryCard: {
    borderRadius: wp(8),
    height: wp(176),
    overflow: 'hidden',
    width: '48.5%',
  },
  galleryCardTall: {
    height: wp(362),
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(10),
  },
  galleryImage: {
    height: '100%',
    width: '100%',
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
  rendererButton: {
    alignItems: 'center',
    borderRadius: wp(8),
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: 'center',
    minHeight: wp(38),
    paddingHorizontal: wp(12),
  },
  rendererButtonText: {
    fontSize: wp(13),
    fontWeight: '800',
    lineHeight: wp(16),
  },
  rendererSwitch: {
    flexDirection: 'row',
    gap: wp(8),
    marginBottom: wp(16),
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
