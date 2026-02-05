import { useMemo } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  View,
  Dimensions,
} from "react-native";

import { ThemedText } from "@/src/components/themed-text";
import { ThemedView } from "@/src/components/themed-view";
import StatPill from "@/src/features/game/components/StatPill";
import StatRow from "@/src/features/game/components/StatRow";
import { styles } from "@/src/features/game/styles";
import type { Character } from "@/src/shared/types";

type ChooseCharacterScreenProps = {
  insetTop: number;
  characters: Character[];
  onIndexChange: (index: number) => void;
  onStart: () => void;
  detailCharacter: Character | null;
  onShowDetail: (character: Character) => void;
  onCloseDetail: () => void;
  listRef: React.RefObject<FlatList<Character>>;
  scrollX: Animated.Value;
};

export default function ChooseCharacterScreen({
  insetTop,
  characters,
  onIndexChange,
  onStart,
  detailCharacter,
  onShowDetail,
  onCloseDetail,
  listRef,
  scrollX,
}: ChooseCharacterScreenProps) {
  const { cardWidth, snapInterval } = useMemo(() => {
    const { width } = Dimensions.get("window");
    const widthValue = Math.min(width - 64, 300);
    const gap = 12;
    return { cardWidth: widthValue, snapInterval: widthValue + gap };
  }, []);

  return (
    <ThemedView
      style={[
        styles.screen,
        styles.screenCompact,
        { paddingTop: Math.max(12, insetTop) },
      ]}
    >
      <View style={styles.startHeroCompact}>
        <ThemedText type="title">Обери персонажа</ThemedText>
        <ThemedText style={styles.startText}>
          Стартові стати визначають твої перші шанси.
        </ThemedText>
        <View style={styles.carouselWrap}>
          <Animated.FlatList
            ref={listRef}
            data={characters}
            keyExtractor={(item) => item.id}
            style={styles.characterScroll}
            contentContainerStyle={styles.characterList}
            horizontal
            snapToInterval={snapInterval}
            snapToAlignment="start"
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true },
            )}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / snapInterval,
              );
              const nextIndex = Math.max(
                0,
                Math.min(characters.length - 1, index),
              );
              onIndexChange(nextIndex);
            }}
            scrollEventThrottle={16}
            getItemLayout={(_, index) => ({
              length: snapInterval,
              offset: snapInterval * index,
              index,
            })}
            renderItem={({ item, index }) => {
              const inputRange = [
                (index - 1) * snapInterval,
                index * snapInterval,
                (index + 1) * snapInterval,
              ];
              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [0.96, 1, 0.96],
                extrapolate: "clamp",
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.7, 1, 0.7],
                extrapolate: "clamp",
              });
              return (
                <View
                  style={[
                    styles.characterCard,
                    { width: cardWidth, marginRight: 12 },
                  ]}
                >
                  <View style={styles.characterHeader}>
                    <ThemedText
                      type="defaultSemiBold"
                      style={styles.characterName}
                    >
                      {item.name}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.characterDesc}>
                    {item.description}
                  </ThemedText>
                  <View style={styles.characterStats}>
                    <StatPill label="Гроші" value={item.stats.money} />
                    <StatPill label="Репутація" value={item.stats.reputation} />
                    <StatPill label="Сила" value={item.stats.skill} />
                    <StatPill label="Здоровʼя" value={item.stats.health} />
                  </View>
                  <Pressable
                    onPress={() => onShowDetail(item)}
                    style={styles.selectButton}
                  >
                    <ThemedText style={styles.selectButtonText}>
                      Деталі
                    </ThemedText>
                  </Pressable>
                </View>
              );
            }}
          />
        </View>
        <Pressable onPress={onStart} style={styles.primaryButton}>
          <ThemedText style={styles.primaryButtonText}>Почати життя</ThemedText>
        </Pressable>
      </View>
      <View style={styles.characterPreviewWrap}>
        {characters.map((item, index) => {
          const inputRange = [
            (index - 1) * snapInterval,
            index * snapInterval,
            (index + 1) * snapInterval,
          ];
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.9, 1.05, 0.9],
            extrapolate: "clamp",
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0, 1, 0],
            extrapolate: "clamp",
          });
          return (
            <Animated.Image
              key={item.id}
              source={item.image}
              style={[styles.characterPreview, { transform: [{ scale }], opacity }]}
            />
          );
        })}
      </View>
      {detailCharacter ? (
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <ThemedText type="subtitle" style={styles.resultTitle}>
                {detailCharacter.name}
              </ThemedText>
              <ThemedText style={styles.resultText}>
                {detailCharacter.lore}
              </ThemedText>
            </View>
            <View style={styles.deltaList}>
              <StatRow label="Гроші" value={detailCharacter.stats.money} />
              <StatRow
                label="Репутація"
                value={detailCharacter.stats.reputation}
              />
              <StatRow label="Сила/Вміння" value={detailCharacter.stats.skill} />
              <StatRow label="Здоровʼя" value={detailCharacter.stats.health} />
              <StatRow label="Карма" value={detailCharacter.stats.karma} />
            </View>
            <View style={styles.choiceList}>
              <Pressable onPress={onCloseDetail} style={styles.secondaryButton}>
                <ThemedText style={styles.secondaryButtonText}>Закрити</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </ThemedView>
  );
}
