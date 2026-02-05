import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 80,
    gap: 16,
    backgroundColor: '#F7F1E6',
  },
  gameScreen: {
    flex: 1,
  },
  header: {
    gap: 6,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#1C1305',
    borderWidth: 1,
    borderColor: 'rgba(216,179,106,0.45)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTitle: {
    color: '#F6E7C8',
  },
  headerSubtitle: {
    color: 'rgba(246,231,200,0.8)',
    flex: 1,
  },
  headerToggle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerToggleText: {
    color: '#F6E7C8',
    fontSize: 11,
    fontWeight: '600',
  },
  statsHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  statInline: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    gap: 6,
  },
  statInlineLabel: {
    color: '#F6E7C8',
    fontSize: 11,
  },
  statInlineValue: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  section: {
    gap: 8,
  },
  heroCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(216,179,106,0.35)',
    backgroundColor: '#FFF6E6',
  },
  heroImage: {
    width: 180,
    height: 200,
    resizeMode: 'contain',
  },
  statsCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(216,179,106,0.35)',
    backgroundColor: '#FFF6E6',
  },
  statItem: {
    width: '30%',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#FFFBF4',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: 1,
  },
  statLabel: {
    color: 'rgba(22,20,16,0.65)',
    fontSize: 10,
  },
  statValue: {
    fontSize: 13,
  },
  sceneCard: {
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(216,179,106,0.35)',
    backgroundColor: '#FFF6E6',
  },
  sceneText: {
    color: 'rgba(22,20,16,0.7)',
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choiceRow: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(28,19,5,0.12)',
    backgroundColor: '#FFFBF4',
    gap: 8,
    width: '48%',
    justifyContent: 'space-between',
    minHeight: 118,
  },
  choiceRowText: {
    gap: 4,
  },
  choiceDetailButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(28,19,5,0.2)',
    marginTop: 6,
  },
  choiceDetailText: {
    color: 'rgba(28,19,5,0.8)',
    fontWeight: '600',
  },
  choicePickCorner: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28,19,5,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(28,19,5,0.25)',
  },
  choicePickCornerText: {
    color: '#1C1305',
    fontWeight: '700',
  },
  choiceLockedText: {
    color: 'rgba(22,20,16,0.6)',
    fontSize: 11,
  },
  choiceChance: {
    color: 'rgba(22,20,16,0.55)',
    fontSize: 12,
  },
  choiceMoneyRange: {
    color: 'rgba(22,20,16,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  ending: {
    gap: 12,
  },
  endingTitle: {
    fontSize: 18,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#D8B36A',
  },
  primaryButtonText: {
    color: '#1C1305',
    fontWeight: '600',
  },
  logCard: {
    gap: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(216,179,106,0.35)',
    backgroundColor: '#FFF6E6',
  },
  logEntry: {
    color: 'rgba(22,20,16,0.7)',
  },
  logEmpty: {
    color: 'rgba(22,20,16,0.6)',
  },
  startHero: {
    flex: 1,
    gap: 16,
    paddingTop: 48,
  },
  startHeroCompact: {
    flex: 1,
    gap: 14,
    paddingTop: 0,
  },
  screenCompact: {
    paddingTop: 0,
  },
  startText: {
    opacity: 0.8,
  },
  startCard: {
    gap: 6,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  carouselWrap: {
    marginTop: 6,
  },
  startBullet: {
    opacity: 0.8,
  },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(8,6,4,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultCard: {
    width: '100%',
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#15120E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    gap: 14,
  },
  resultHeader: {
    gap: 6,
  },
  resultTitle: {
    color: '#E8D3A0',
  },
  modalSectionTitle: {
    color: '#F2DFC0',
  },
  resultText: {
    color: 'rgba(255,255,255,0.85)',
  },
  deltaList: {
    gap: 6,
    paddingVertical: 6,
  },
  resultDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 8,
  },
  deltaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deltaLabel: {
    color: 'rgba(255,255,255,0.7)',
  },
  deltaValue: {
    color: '#FFFFFF',
  },
  deltaPositive: {
    color: '#59C173',
    fontWeight: '600',
  },
  deltaNegative: {
    color: '#E35D5B',
    fontWeight: '600',
  },
  eventBox: {
    gap: 6,
  },
  eventTitle: {
    color: '#E8D3A0',
  },
  eventText: {
    color: 'rgba(255,255,255,0.75)',
  },
  characterList: {
    paddingTop: 10,
    paddingBottom: 12,
  },
  characterScroll: {
    maxHeight: 360,
  },
  characterCard: {
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(216,179,106,0.45)',
    backgroundColor: 'rgba(255,246,229,0.72)',
    gap: 10,
  },
  characterArtWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  characterArt: {
    width: 120,
    height: 140,
    resizeMode: 'contain',
  },
  characterPreviewWrap: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
  },
  characterPreview: {
    position: 'absolute',
    width: 220,
    height: 220,
    resizeMode: 'contain',
  },
  characterName: {
    fontSize: 18,
  },
  characterCardActive: {
    borderColor: '#C58E2C',
    backgroundColor: 'rgba(255,240,214,0.95)',
  },
  characterDesc: {
    color: 'rgba(22,20,16,0.75)',
    fontSize: 13,
  },
  characterStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  characterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(197,142,44,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(197,142,44,0.5)',
  },
  roleChipText: {
    fontSize: 11,
    color: '#6E4C12',
    fontWeight: '600',
  },
  statPill: {
    width: '48%',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: 2,
  },
  statPillLabel: {
    fontSize: 11,
    color: 'rgba(22,20,16,0.6)',
  },
  statPillValue: {
    color: '#1C1305',
  },
  selectButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1C1305',
    marginTop: 4,
  },
  selectButtonText: {
    color: '#F6E7C8',
    fontWeight: '600',
  },
  choiceList: {
    gap: 10,
  },
  miniStat: {
    gap: 2,
  },
  miniStatLabel: {
    fontSize: 11,
    opacity: 0.6,
  },
  resultButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#D8B36A',
  },
  resultButtonText: {
    color: '#1C1305',
    fontWeight: '600',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  weatherOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 520,
    zIndex: 1,
  },
  weatherTint: {
    ...StyleSheet.absoluteFillObject,
  },
  weatherLayer: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: '120%',
    height: '120%',
    resizeMode: 'cover',
  },
});
