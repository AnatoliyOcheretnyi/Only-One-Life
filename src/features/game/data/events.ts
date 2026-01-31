import type { WorldEvent } from '@/src/shared/types';

export const events: WorldEvent[] = [

  {
    id: 'good-harvest',
    title: 'Добрий урожай',
    text: 'Ціни на зерно падають. Їжа дешевшає.',
    effects: { money: 2, health: 1, luck: 1 },
  },
  {
    id: 'market-fraud',
    title: 'Ринкове шахрайство',
    text: 'Тебе обманюють на вазі. Частина грошей зникає.',
    effects: { money: -3, reputation: -1, luck: -1 },
  },
  {
    id: 'fever',
    title: 'Лихоманка',
    text: 'Хвороба проходить містом. Ти слабшаєш.',
    effects: { health: -3 },
  },
  {
    id: 'patron-gift',
    title: 'Покровительський дар',
    text: 'Місцевий впливовий знайомий допомагає тобі.',
    effects: { money: 4, reputation: 2, luck: 1 },
  },
  {
    id: 'brawl',
    title: 'Вулична бійка',
    text: 'Сутичка залишає шрами, але додає рішучості.',
    effects: { health: -2, skill: 1 },
  },
  {
    id: 'quiet-season',
    title: 'Спокійний сезон',
    text: 'Місто заспокоюється. Ти відновлюєшся.',
    effects: { health: 2 },
  },
  {
    id: 'storm',
    title: 'Буря',
    text: 'Негода нищить припаси і плани.',
    effects: { money: -2, health: -1, luck: -1 },
  },
  {
    id: 'tax-collector',
    title: 'Податковий збір',
    text: 'Місто збирає додатковий податок.',
    effects: { money: -3 },
  },
  {
    id: 'lost-purse',
    title: 'Втрачений гаманець',
    text: 'Хтось губить гаманець поруч із тобою.',
    effects: { money: 3, reputation: -1, luck: 1 },
  },
  {
    id: 'free-soup',
    title: 'Безкоштовний суп',
    text: 'Мандрівні монахи роздають їжу.',
    effects: { health: 1, reputation: 1 },
  },
  {
    id: 'road-toll',
    title: 'Мито на дорозі',
    text: 'Збирачі беруть плату за прохід.',
    effects: { money: -2 },
  },
  {
    id: 'kind-stranger',
    title: 'Добрий мандрівник',
    text: 'Незнайомець ділиться їжею.',
    effects: { health: 1 },
  },
  {
    id: 'minor-injury',
    title: 'Дрібна травма',
    text: 'Невдалий рух — і забій.',
    effects: { health: -1 },
  },
  {
    id: 'market-boost',
    title: 'Жвавий ринок',
    text: 'Продажі йдуть краще звичайного.',
    effects: { money: 2 },
  },
  {
    id: 'bad-rumors',
    title: 'Погані чутки',
    text: 'Про тебе говорять недобре.',
    effects: { reputation: -2 },
  },
  {
    id: 'good-word',
    title: 'Добре слово',
    text: 'Хтось замовляє за тебе слово.',
    effects: { reputation: 2 },
  },
  {
    id: 'tool-break',
    title: 'Зламаний інструмент',
    text: 'Робота стає важчою.',
    effects: { skill: -1, money: -1 },
  },
  {
    id: 'lucky-find',
    title: 'Щаслива знахідка',
    text: 'Ти знаходиш корисну річ.',
    effects: { money: 1, skill: 1, luck: 2 },
  },
  {
    id: 'small-feast',
    title: 'Невеликий бенкет',
    text: 'Тебе кличуть поїсти.',
    effects: { health: 2 },
  },
  {
    id: 'rainy-week',
    title: 'Дощові дні',
    text: 'Роботи менше, настрій гірший.',
    effects: { money: -1, fatigue: 1 },
  },
];
