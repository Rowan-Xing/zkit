import { StyleSheet } from 'react-native';
import { wp } from 'y2kit-tools';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: wp(20),
  },
  header: {
    gap: wp(18),
    paddingBottom: wp(22),
  },
  headerTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: wp(14),
  },
  logo: {
    alignItems: 'center',
    borderRadius: wp(8),
    height: wp(48),
    justifyContent: 'center',
    width: wp(48),
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: wp(13),
    fontWeight: '600',
    lineHeight: wp(18),
  },
  title: {
    fontSize: wp(34),
    fontWeight: '800',
    lineHeight: wp(40),
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(8),
  },
  metaPill: {
    borderRadius: wp(8),
    paddingHorizontal: wp(10),
    paddingVertical: wp(7),
  },
  metaPillText: {
    fontSize: wp(13),
    fontWeight: '700',
    lineHeight: wp(18),
  },
  section: {
    borderTopWidth: wp(1),
    gap: wp(14),
    paddingVertical: wp(22),
  },
  sectionTitle: {
    fontSize: wp(18),
    fontWeight: '800',
    lineHeight: wp(24),
  },
  buttonGrid: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(10),
  },
  fieldStack: {
    gap: wp(12),
  },
  textInput: {
    borderRadius: wp(8),
    borderWidth: wp(1),
    fontSize: wp(16),
    minHeight: wp(48),
    paddingHorizontal: wp(14),
    paddingVertical: wp(10),
  },
  switchRow: {
    alignItems: 'center',
    borderRadius: wp(8),
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: wp(54),
  },
  switchCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: wp(14),
  },
  controlLabel: {
    fontSize: wp(15),
    fontWeight: '700',
    lineHeight: wp(20),
  },
  controlValue: {
    fontSize: wp(13),
    lineHeight: wp(18),
    marginTop: wp(2),
  },
  spinnerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: wp(10),
    minHeight: wp(32),
  },
  selectionGrid: {
    gap: wp(16),
  },
  selectionBlock: {
    gap: wp(12),
  },
  accordion: {
    gap: wp(10),
  },
  accordionItem: {
    borderWidth: wp(1),
  },
  linkedIntro: {
    alignItems: 'center',
    borderRadius: wp(8),
    borderWidth: wp(1),
    flexDirection: 'row',
    gap: wp(12),
    paddingHorizontal: wp(14),
    paddingVertical: wp(14),
  },
  linkedIntroCopy: {
    flex: 1,
    minWidth: 0,
  },
  linkedIntroText: {
    fontSize: wp(13),
    lineHeight: wp(18),
    marginTop: wp(4),
  },
  linkedDemoHeader: {
    alignItems: 'center',
    borderBottomWidth: wp(1),
    flexDirection: 'row',
    gap: wp(12),
    paddingBottom: wp(12),
    paddingHorizontal: wp(16),
  },
  linkedBackButton: {
    alignItems: 'center',
    borderRadius: wp(18),
    height: wp(36),
    justifyContent: 'center',
    width: wp(36),
  },
  linkedDemoTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  linkedDemoTitle: {
    fontSize: wp(19),
    fontWeight: '800',
    lineHeight: wp(24),
  },
  linkedDemoSubtitle: {
    fontSize: wp(13),
    lineHeight: wp(18),
    marginTop: wp(2),
  },
  linkedSelectedBadge: {
    alignItems: 'center',
    borderRadius: wp(13),
    justifyContent: 'center',
    minHeight: wp(26),
    minWidth: wp(72),
    paddingHorizontal: wp(10),
  },
  linkedSelectedBadgeText: {
    fontSize: wp(12),
    fontWeight: '800',
    lineHeight: wp(16),
  },
  linkedDemoBody: {
    flex: 1,
    minHeight: 0,
  },
  linkedMenuContent: {
    paddingVertical: wp(8),
  },
  linkedSectionCard: {
    borderRadius: wp(8),
    borderWidth: wp(1),
    overflow: 'hidden',
    paddingHorizontal: wp(18),
    paddingVertical: wp(18),
  },
  linkedSectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: wp(12),
  },
  linkedSectionNumber: {
    fontSize: wp(13),
    fontWeight: '900',
    lineHeight: wp(18),
    minWidth: wp(24),
  },
  linkedSectionTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  linkedSectionTitle: {
    fontSize: wp(22),
    fontWeight: '900',
    lineHeight: wp(28),
  },
  linkedSummary: {
    fontSize: wp(14),
    lineHeight: wp(20),
    marginTop: wp(6),
  },
  linkedChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(8),
    marginTop: wp(18),
  },
  linkedChip: {
    borderRadius: wp(12),
    borderWidth: wp(1),
    justifyContent: 'center',
    minHeight: wp(24),
    paddingHorizontal: wp(10),
  },
  linkedChipText: {
    fontSize: wp(12),
    fontWeight: '700',
    lineHeight: wp(16),
  },
  linkedMetricStack: {
    gap: wp(10),
    marginTop: wp(22),
  },
  linkedMetricRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: wp(28),
  },
  linkedMetricLabel: {
    fontSize: wp(13),
    fontWeight: '700',
    lineHeight: wp(18),
  },
  linkedMetricValue: {
    fontSize: wp(14),
    fontWeight: '800',
    lineHeight: wp(19),
  },
  paragraph: {
    fontSize: wp(14),
    lineHeight: wp(20),
  },
  fieldTrigger: {
    alignItems: 'center',
    borderRadius: wp(8),
    borderWidth: wp(1),
    flexDirection: 'row',
    gap: wp(12),
    minHeight: wp(62),
    paddingHorizontal: wp(12),
    paddingVertical: wp(10),
  },
  fieldIcon: {
    alignItems: 'center',
    borderRadius: wp(8),
    height: wp(36),
    justifyContent: 'center',
    width: wp(36),
  },
  fieldText: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: wp(12),
    fontWeight: '700',
    lineHeight: wp(16),
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontSize: wp(16),
    fontWeight: '700',
    lineHeight: wp(21),
    marginTop: wp(3),
  },
});
