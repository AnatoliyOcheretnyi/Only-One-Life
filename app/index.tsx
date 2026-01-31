import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Stats = {
  money: number;
  reputation: number;
  skill: number;
  health: number;
  age: number;
  family: number;
  hungerDebt: number;
  fatigue: number;
};

type Effects = Partial<Stats>;

type Choice = {
  id: string;
  label: string;
  description: string;
  baseChance: number;
  minHealth?: number;
  successText: string;
  failText: string;
  success: Effects;
  fail: Effects;
};

type Scene = {
  id: string;
  title: string;
  text: string;
  minStage?: Stage;
  forCharacter?: string[];
  choices: Choice[];
};

type WorldEvent = {
  id: string;
  title: string;
  text: string;
  effects: Effects;
};

type Stage = 'Early' | 'Rising' | 'Established' | 'Noble';

const MAX_TURNS = 18;
const EVENT_EVERY_TURNS = 3;
const BASE_UPKEEP = -1;
const MIN_HEALTH_FOR_FAMILY = 8;
const MIN_HEALTH_FOR_COMBAT = 6;

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

type Character = {
  id: string;
  name: string;
  description: string;
  lore: string;
  stats: Stats;
  image: number;
};

const characters: Character[] = [
  {
    id: 'urchin',
    name: 'Вуличний сирота',
    description: 'Витривалий, але без грошей і звʼязків.',
    lore: 'Ти виріс на холодних вулицях і навчився виживати без підтримки. Твої навички грубі, але надійні.',
    stats: {
      money: 2,
      reputation: 1,
      skill: 2,
      health: 12,
      age: 16,
      family: 0,
      hungerDebt: 0,
      fatigue: 0,
    },
    image: require('../src/assets/charecters/syrota.png'),
  },
  {
    id: 'apprentice',
    name: 'Учень майстра',
    description: 'Трохи вмінь та помірна репутація.',
    lore: 'Ти бачив ремесло зблизька, але справжня майстерність ще попереду. Люди ставляться до тебе з обережною повагою.',
    stats: {
      money: 4,
      reputation: 3,
      skill: 3,
      health: 10,
      age: 17,
      family: 0,
      hungerDebt: 0,
      fatigue: 0,
    },
    image: require('../src/assets/charecters/uchen.png'),
  },
  {
    id: 'refugee',
    name: 'Біженець',
    description: 'Мало грошей, але сильне здоровʼя.',
    lore: 'Після втечі від війни ти втратив дім, але зберіг витривалість. Ти не маєш звʼязків, зате маєш силу.',
    stats: {
      money: 3,
      reputation: 1,
      skill: 1,
      health: 14,
      age: 18,
      family: 0,
      hungerDebt: 0,
      fatigue: 0,
    },
    image: require('../src/assets/charecters/bizhenec.png'),
  },
  {
    id: 'farmer',
    name: 'Селянин',
    description: 'Звик до важкої праці, мало грошей, але міцне здоровʼя.',
    lore: 'Ти виріс на землі та звик до важкої праці. Вмієш витримувати труднощі, але багатства не маєш.',
    stats: {
      money: 3,
      reputation: 2,
      skill: 2,
      health: 12,
      age: 20,
      family: 0,
      hungerDebt: 0,
      fatigue: 0,
    },
    image: require('../src/assets/charecters/selianyn.png'),
  },
];

const scenes: Scene[] = [
  {
    id: 'dockwork',
    title: 'Робота на річкових доках',
    text: 'Бригадир пропонує день важкої роботи з вантажами.',
    choices: [
      {
        id: 'take-shift',
        label: 'Взяти зміну',
        description: 'Стабільна платня, ризик виснаження.',
        baseChance: 0.85,
        successText: 'Ти завершуєш зміну і отримуєш платню.',
        failText: 'Перевтома: падаєш до завершення роботи.',
        success: { money: 3, skill: 1 },
        fail: { health: -2, reputation: -1 },
      },
      {
        id: 'demand-more',
        label: 'Вимагати вищу платню',
        description: 'Може підняти репутацію або відштовхнути.',
        baseChance: 0.35,
        successText: 'Бригадир погоджується. Ти виглядаєш сміливо.',
        failText: 'Він сміється і проганяє тебе.',
        success: { money: 5, reputation: 2 },
        fail: { reputation: -1 },
      },
      {
        id: 'ask-apprentice',
        label: 'Попросити вчитися',
        description: 'Менше грошей, але шанс на навички.',
        baseChance: 0.6,
        successText: 'Тобі дозволяють допомагати й вчитися.',
        failText: 'Тебе не беруть без досвіду.',
        success: { skill: 2, reputation: 1, money: -1 },
        fail: { reputation: -1 },
      },
      {
        id: 'rest-day',
        label: 'Взяти день відпочинку',
        description: 'Без заробітку, але відновлення.',
        baseChance: 1,
        successText: 'Ти відновлюєш сили та здоровʼя.',
        failText: 'Ти відновлюєш сили та здоровʼя.',
        success: { health: 2, fatigue: -2 },
        fail: {},
      },
    ],
  },
  {
    id: 'alley-favor',
    title: 'Сумнівна послуга',
    text: 'Контрабандист просить перенести запечатаний пакунок через місто.',
    choices: [
      {
        id: 'carry-package',
        label: 'Перенести пакунок',
        description: 'Швидкі гроші, але ризик проблем.',
        baseChance: 0.55,
        successText: 'Ти доставляєш пакунок і отримуєш платню.',
        failText: 'Тебе зупиняють вартові. Ти тікаєш, але втрачаєш обличчя.',
        success: { money: 6, reputation: -1 },
        fail: { reputation: -2, health: -1 },
      },
      {
        id: 'refuse',
        label: 'Відмовитись',
        description: 'Безпечніше, але без вигоди.',
        baseChance: 1,
        successText: 'Ти тримаєшся осторонь і не ризикуєш.',
        failText: 'Ти тримаєшся осторонь і не ризикуєш.',
        success: { reputation: 1 },
        fail: {},
      },
      {
        id: 'negotiate',
        label: 'Домовитись про частку',
        description: 'Спроба підняти винагороду.',
        baseChance: 0.4,
        successText: 'Він погоджується на більшу частку.',
        failText: 'Він ображається і відходить.',
        success: { money: 8, reputation: -1 },
        fail: { reputation: -2 },
      },
      {
        id: 'tip-guards',
        label: 'Попередити варту',
        description: 'Ризиковано, але шанс на репутацію.',
        baseChance: 0.35,
        successText: 'Варта вдячна. Твоє імʼя звучить краще.',
        failText: 'Контрабандист дізнається і мститься.',
        success: { reputation: 3 },
        fail: { health: -2, money: -1 },
      },
    ],
  },
  {
    id: 'training-yard',
    title: 'Тренувальний двір',
    text: 'Відставний солдат пропонує навчання в обмін на роботу.',
    choices: [
      {
        id: 'train',
        label: 'Тренуватись',
        description: 'Повільний прогрес, але стабільно.',
        baseChance: 0.7,
        successText: 'Ти вчишся дисципліні та основам бою.',
        failText: 'Ти не вразив наставника й тебе відпускають.',
        success: { skill: 2, reputation: 1 },
        fail: { reputation: -1 },
      },
      {
        id: 'skip-train',
        label: 'Пропустити',
        description: 'Без ризику, але й без росту.',
        baseChance: 1,
        successText: 'Ти зберігаєш час для інших справ.',
        failText: 'Ти зберігаєш час для інших справ.',
        success: { fatigue: -1 },
        fail: {},
      },
      {
        id: 'sparring',
        label: 'Вийти на спаринг',
        description: 'Швидкий прогрес або травма.',
        minHealth: MIN_HEALTH_FOR_COMBAT,
        baseChance: 0.45,
        successText: 'Ти показуєш силу і здобуваєш повагу.',
        failText: 'Ти отримуєш удар і втрачаєш здоровʼя.',
        success: { skill: 3, reputation: 2 },
        fail: { health: -3 },
      },
      {
        id: 'errands',
        label: 'Допомагати по двору',
        description: 'Трохи грошей за дрібні справи.',
        baseChance: 0.8,
        successText: 'Ти працюєш і отримуєш невелику платню.',
        failText: 'Тебе відпускають без оплати.',
        success: { money: 2 },
        fail: {},
      },
    ],
  },
  {
    id: 'family-home',
    title: 'Розмова про сімʼю',
    text: 'Тобі пропонують осісти й створити сімʼю.',
    minStage: 'Rising',
    choices: [
      {
        id: 'start-family',
        label: 'Зробити крок',
        description: 'Стабільність і тягарі.',
        minHealth: MIN_HEALTH_FOR_FAMILY,
        baseChance: 0.6,
        successText: 'Ти знаходиш пару. Сімʼя зʼявляється.',
        failText: 'Спроба не вдалася, але ти вчишся терпінню.',
        success: { reputation: 2, family: 1, money: -2 },
        fail: { reputation: -1 },
      },
      {
        id: 'delay-family',
        label: 'Відкласти',
        description: 'Не час для зобовʼязань.',
        baseChance: 1,
        successText: 'Ти відкладаєш це рішення.',
        failText: 'Ти відкладаєш це рішення.',
        success: {},
        fail: {},
      },
      {
        id: 'matchmaker',
        label: 'Звернутись до свахи',
        description: 'Шанс на сильні звʼязки.',
        minHealth: MIN_HEALTH_FOR_FAMILY,
        baseChance: 0.45,
        successText: 'Сваха знаходить добру пару.',
        failText: 'Спроба лише марнує гроші.',
        success: { family: 1, reputation: 3, money: -3 },
        fail: { money: -2 },
      },
      {
        id: 'focus-work',
        label: 'Зосередитись на праці',
        description: 'Підсилює стабільність, але самотньо.',
        baseChance: 0.7,
        successText: 'Ти збільшуєш дохід, жертвуючи особистим.',
        failText: 'Ти перевтомлюєшся і втрачаєш здоровʼя.',
        success: { money: 3 },
        fail: { health: -2 },
      },
    ],
  },
  {
    id: 'family-growth',
    title: 'Поповнення в домі',
    text: 'Є шанс, що сімʼя збільшиться.',
    minStage: 'Established',
    choices: [
      {
        id: 'support-family',
        label: 'Підтримати',
        description: 'Більше турбот і відповідальності.',
        minHealth: MIN_HEALTH_FOR_FAMILY,
        baseChance: 0.5,
        successText: 'У твоїй сімʼї народжується дитина.',
        failText: 'Зараз не вийшло, але звʼязок міцніший.',
        success: { family: 1, reputation: 1, money: -1 },
        fail: { reputation: 1 },
      },
      {
        id: 'postpone-growth',
        label: 'Стриматися',
        description: 'Зосередитись на виживанні.',
        baseChance: 1,
        successText: 'Ти бережеш ресурси на інші цілі.',
        failText: 'Ти бережеш ресурси на інші цілі.',
        success: {},
        fail: {},
      },
      {
        id: 'hire-help',
        label: 'Найняти поміч',
        description: 'Полегшує побут, але коштує.',
        baseChance: 0.6,
        successText: 'Дім стає організованішим.',
        failText: 'Поміч виявляється ненадійним.',
        success: { reputation: 1, money: -2 },
        fail: { money: -2 },
      },
      {
        id: 'move-home',
        label: 'Переїхати у кращий дім',
        description: 'Шанс на статус або борги.',
        baseChance: 0.4,
        successText: 'Ти піднімаєш статус сімʼї.',
        failText: 'Оренда тисне і шкодить бюджету.',
        success: { reputation: 2, money: -3 },
        fail: { money: -4 },
      },
    ],
  },
  {
    id: 'market-stall',
    title: 'Ринковий прилавок',
    text: 'Купцю потрібна допомога з продажем товарів.',
    minStage: 'Rising',
    choices: [
      {
        id: 'work-market',
        label: 'Допомогти купцю',
        description: 'Зміцнює репутацію та зв’язки.',
        baseChance: 0.75,
        successText: 'Продажі високі. Купець тебе хвалить.',
        failText: 'Ти плутаєшся в грошах і втрачаєш довіру.',
        success: { money: 4, reputation: 3 },
        fail: { reputation: -2, money: -1 },
      },
      {
        id: 'buy-cheap',
        label: 'Купити дешевий товар',
        description: 'Невеликий ризик за власні гроші.',
        baseChance: 0.45,
        successText: 'Ти продаєш товар із прибутком.',
        failText: 'Товар псується, ти втрачаєш гроші.',
        success: { money: 8, reputation: 1 },
        fail: { money: -4 },
      },
      {
        id: 'haggle',
        label: 'Торгуватись з покупцями',
        description: 'Може підняти прибуток або дратувати людей.',
        baseChance: 0.55,
        successText: 'Ти вибиваєш кращу ціну.',
        failText: 'Покупці незадоволені й йдуть.',
        success: { money: 3, reputation: 1 },
        fail: { reputation: -2 },
      },
      {
        id: 'scout-routes',
        label: 'Розвідати нові маршрути',
        description: 'Ризик, але шанс на ріст репутації.',
        baseChance: 0.4,
        successText: 'Ти знаходиш вигідний шлях постачання.',
        failText: 'Ти марнуєш час без користі.',
        success: { reputation: 3, skill: 1 },
        fail: { reputation: -1 },
      },
    ],
  },
  {
    id: 'town-guard',
    title: 'Міська варта',
    text: 'Капітан шукає нових людей для охорони воріт.',
    minStage: 'Established',
    choices: [
      {
        id: 'join-guard',
        label: 'Вступити до варти',
        description: 'Стабільна платня, але є ризики.',
        baseChance: 0.6,
        successText: 'Тебе приймають, ти маєш стабільний дохід.',
        failText: 'Тебе відмовляють через низький статус.',
        success: { money: 6, reputation: 4, skill: 1 },
        fail: { reputation: -2 },
      },
      {
        id: 'challenge-duel',
        label: 'Викликати задираку',
        description: 'Ризикований показ сили.',
        minHealth: MIN_HEALTH_FOR_COMBAT,
        baseChance: 0.4,
        successText: 'Ти виграєш двобій. Люди це пам’ятають.',
        failText: 'Ти програєш і кульгаєш геть.',
        success: { reputation: 5, skill: 1 },
        fail: { health: -3, reputation: -3 },
      },
      {
        id: 'bribe-clerk',
        label: 'Домовитись через писаря',
        description: 'Платиш за швидше оформлення.',
        baseChance: 0.5,
        successText: 'Тебе приймають без зайвих питань.',
        failText: 'Гроші зникають, а місця немає.',
        success: { reputation: 2, money: -2 },
        fail: { money: -3 },
      },
      {
        id: 'night-watch',
        label: 'Взяти нічну варту',
        description: 'Важко, але помітно.',
        baseChance: 0.65,
        successText: 'Ти витримуєш ніч і здобуваєш повагу.',
        failText: 'Ти засинаєш на посту й отримуєш осуд.',
        success: { reputation: 2, money: 2 },
        fail: { reputation: -2 },
      },
    ],
  },
  {
    id: 'noble-court',
    title: 'Двір шляхтича',
    text: 'Малий шляхтич пропонує покровительство, якщо доведеш цінність.',
    minStage: 'Noble',
    choices: [
      {
        id: 'offer-service',
        label: 'Запропонувати службу',
        description: 'Високий статус, але велика ціна.',
        baseChance: 0.55,
        successText: 'Ти отримуєш сильного покровителя.',
        failText: 'Тебе відпускають як посереднього.',
        success: { reputation: 8, money: 6 },
        fail: { reputation: -3 },
      },
      {
        id: 'broker-deal',
        label: 'Укласти торгову угоду',
        description: 'Використати становище заради прибутку.',
        baseChance: 0.45,
        successText: 'Твоя угода збагачує обидві сторони.',
        failText: 'План провалюється і шкодить імені.',
        success: { money: 12, reputation: 4 },
        fail: { reputation: -4, money: -3 },
      },
      {
        id: 'host-feast',
        label: 'Організувати прийом',
        description: 'Великий шанс на славу або ганьбу.',
        baseChance: 0.4,
        successText: 'Прийом вдається і ти вражаєш двір.',
        failText: 'Гості незадоволені. Твоє імʼя страждає.',
        success: { reputation: 6, money: -4 },
        fail: { reputation: -5, money: -2 },
      },
      {
        id: 'seek-alliances',
        label: 'Шукати союзів',
        description: 'Тонка гра зі статусами.',
        baseChance: 0.5,
        successText: 'Ти знаходиш впливового союзника.',
        failText: 'Ти ображаєш важливу персону.',
        success: { reputation: 5, skill: 1 },
        fail: { reputation: -4 },
      },
    ],
  },
  {
    id: 'tavern-night',
    title: 'Ніч у таверні',
    text: 'У таверні шумно: тут і чутки, і ризики.',
    choices: [
      {
        id: 'listen-rumors',
        label: 'Слухати чутки',
        description: 'Шанс на корисну інформацію.',
        baseChance: 0.6,
        successText: 'Ти дізнаєшся про вигідну можливість.',
        failText: 'Плітки виявляються порожніми.',
        success: { reputation: 1, skill: 1 },
        fail: {},
      },
      {
        id: 'gamble-coins',
        label: 'Грати в кості',
        description: 'Ризик заради швидких грошей.',
        baseChance: 0.4,
        successText: 'Ти виграєш і виходиш у плюс.',
        failText: 'Ти програєш і лишаєшся без монет.',
        success: { money: 4 },
        fail: { money: -3 },
      },
      {
        id: 'help-barkeep',
        label: 'Допомогти шинкарю',
        description: 'Невеликий заробіток і повага.',
        baseChance: 0.8,
        successText: 'Ти чесно відпрацьовуєш вечір.',
        failText: 'Втома бере своє, ти не справляєшся.',
        success: { money: 2, reputation: 1 },
        fail: { health: -1 },
      },
      {
        id: 'avoid-trouble',
        label: 'Триматися осторонь',
        description: 'Безпечно, але без користі.',
        baseChance: 1,
        successText: 'Ти уникаєш конфліктів і йдеш рано.',
        failText: 'Ти уникаєш конфліктів і йдеш рано.',
        success: { health: 1 },
        fail: {},
      },
    ],
  },
  {
    id: 'monastery-visit',
    title: 'Монастирські ворота',
    text: 'Братія просить допомоги в обмін на притулок.',
    choices: [
      {
        id: 'work-monastery',
        label: 'Допомогти в монастирі',
        description: 'Спокій і невелика винагорода.',
        baseChance: 0.75,
        successText: 'Ти отримуєш їжу та благословення.',
        failText: 'Ти сваришся з братією і йдеш.',
        success: { health: 2, reputation: 1 },
        fail: { reputation: -1 },
      },
      {
        id: 'seek-education',
        label: 'Просити навчання',
        description: 'Шанс на вміння, але не для всіх.',
        baseChance: 0.45,
        successText: 'Тобі дозволяють навчатися письма.',
        failText: 'Тобі відмовляють як занадто необізнаному.',
        success: { skill: 2, reputation: 1 },
        fail: { reputation: -1 },
      },
      {
        id: 'donate',
        label: 'Зробити пожертву',
        description: 'Піднімає репутацію.',
        baseChance: 0.9,
        successText: 'Тебе згадують добрим словом.',
        failText: 'Твоїх монет замало, тебе не помічають.',
        success: { reputation: 2, money: -1 },
        fail: {},
      },
      {
        id: 'move-on',
        label: 'Йти далі',
        description: 'Без змін.',
        baseChance: 1,
        successText: 'Ти вирішуєш не затримуватись.',
        failText: 'Ти вирішуєш не затримуватись.',
        success: {},
        fail: {},
      },
    ],
  },
  {
    id: 'road-ambush',
    title: 'Неспокійна дорога',
    text: 'На околицях з’являються розбійники.',
    minStage: 'Rising',
    choices: [
      {
        id: 'join-caravan',
        label: 'Приєднатися до каравану',
        description: 'Безпечніше, але менше вигоди.',
        baseChance: 0.7,
        successText: 'Ти проходиш шлях без втрат.',
        failText: 'Караван атакують, ти втрачаєш частину майна.',
        success: { reputation: 1 },
        fail: { money: -2, health: -1 },
      },
      {
        id: 'take-shortcut',
        label: 'Йти коротким шляхом',
        description: 'Швидко, але небезпечно.',
        baseChance: 0.35,
        successText: 'Ти успішно минаєш пастки.',
        failText: 'Розбійники забирають твої гроші.',
        success: { skill: 1 },
        fail: { money: -4, health: -2 },
      },
      {
        id: 'hire-guard',
        label: 'Найняти охорону',
        description: 'Дорого, зате надійно.',
        baseChance: 0.8,
        successText: 'Охорона відганяє нападників.',
        failText: 'Охорона тікає, ти втрачаєш монети.',
        success: { reputation: 1, money: -2 },
        fail: { money: -3 },
      },
      {
        id: 'avoid-roads',
        label: 'Уникати доріг',
        description: 'Повільно, але безпечно.',
        baseChance: 1,
        successText: 'Ти йдеш обхідними шляхами.',
        failText: 'Ти йдеш обхідними шляхами.',
        success: { health: -1 },
        fail: {},
      },
    ],
  },
  {
    id: 'guild-offer',
    title: 'Гільдійна пропозиція',
    text: 'Майстер гільдії оцінює твої вміння.',
    minStage: 'Established',
    choices: [
      {
        id: 'join-guild',
        label: 'Вступити до гільдії',
        description: 'Стабільність і вплив.',
        baseChance: 0.6,
        successText: 'Ти отримуєш підтримку гільдії.',
        failText: 'Тобі відмовляють через нестачу репутації.',
        success: { reputation: 3, money: 2 },
        fail: { reputation: -1 },
      },
      {
        id: 'pay-fee',
        label: 'Заплатити внесок',
        description: 'Гарантує розгляд заявки.',
        baseChance: 0.7,
        successText: 'Твою заявку приймають.',
        failText: 'Гроші зникають без результату.',
        success: { reputation: 2, money: -2 },
        fail: { money: -3 },
      },
      {
        id: 'show-skill',
        label: 'Показати майстерність',
        description: 'Ризикований показ уміння.',
        baseChance: 0.5,
        successText: 'Ти вражаєш майстра.',
        failText: 'Ти помиляєшся і губиш репутацію.',
        success: { skill: 2, reputation: 2 },
        fail: { reputation: -2 },
      },
      {
        id: 'stay-independent',
        label: 'Лишитись незалежним',
        description: 'Без зобовʼязань.',
        baseChance: 1,
        successText: 'Ти зберігаєш свободу.',
        failText: 'Ти зберігаєш свободу.',
        success: { money: 1 },
        fail: {},
      },
    ],
  },
  {
    id: 'healer-visit',
    title: 'У знахаря',
    text: 'Місцевий знахар пропонує лікування або трави.',
    choices: [
      {
        id: 'buy-herbs',
        label: 'Купити трави',
        description: 'Може покращити здоровʼя.',
        baseChance: 0.7,
        successText: 'Тобі стає значно краще.',
        failText: 'Трави не допомагають.',
        success: { health: 3, money: -1 },
        fail: { money: -1 },
      },
      {
        id: 'free-help',
        label: 'Попросити безкоштовно',
        description: 'Може спрацювати через репутацію.',
        baseChance: 0.4,
        successText: 'Знахар допомагає з милості.',
        failText: 'Тебе ввічливо відправляють.',
        success: { health: 2, reputation: 1 },
        fail: { reputation: -1 },
      },
      {
        id: 'barter',
        label: 'Обміняти роботу на лікування',
        description: 'Без монет, але з часом.',
        baseChance: 0.6,
        successText: 'Ти відпрацьовуєш і одужуєш.',
        failText: 'Ти виснажуєшся і йдеш.',
        success: { health: 2, money: 1 },
        fail: { health: -1 },
      },
      {
        id: 'ignore-healer',
        label: 'Ігнорувати',
        description: 'Без змін.',
        baseChance: 1,
        successText: 'Ти йдеш далі без лікування.',
        failText: 'Ти йдеш далі без лікування.',
        success: {},
        fail: {},
      },
    ],
  },
  {
    id: 'blacksmith-yard',
    title: 'Кузня',
    text: 'Коваль шукає помічника на день.',
    choices: [
      {
        id: 'forge-help',
        label: 'Допомагати в кузні',
        description: 'Втомлює, але дає гроші й силу.',
        baseChance: 0.75,
        successText: 'Ти витримуєш гарячий день і отримуєш платню.',
        failText: 'Ти обпікаєшся і йдеш раніше.',
        success: { money: 3, skill: 1 },
        fail: { health: -2 },
      },
      {
        id: 'learn-craft',
        label: 'Просити навчити ремеслу',
        description: 'Шанс на навички.',
        baseChance: 0.5,
        successText: 'Коваль показує основи.',
        failText: 'Коваль відмовляє.',
        success: { skill: 2, reputation: 1 },
        fail: { reputation: -1 },
      },
      {
        id: 'sell-charcoal',
        label: 'Продавати вугілля',
        description: 'Невеликий прибуток.',
        baseChance: 0.8,
        successText: 'Ти продаєш кілька мішків.',
        failText: 'Покупців мало.',
        success: { money: 2 },
        fail: {},
      },
      {
        id: 'leave-forge',
        label: 'Піти далі',
        description: 'Без змін.',
        baseChance: 1,
        successText: 'Ти не затримуєшся.',
        failText: 'Ти не затримуєшся.',
        success: {},
        fail: {},
      },
    ],
  },
  {
    id: 'winter-cold',
    title: 'Зимовий холод',
    text: 'Ночі холодні, дах потрібен більше ніж будь-коли.',
    choices: [
      {
        id: 'rent-corner',
        label: 'Орендувати куток',
        description: 'Безпечно, але дорого.',
        baseChance: 0.9,
        successText: 'Ти грієшся і набираєшся сил.',
        failText: 'Ти не знаходиш місця.',
        success: { money: -2, health: 2, fatigue: -1 },
        fail: { health: -2 },
      },
      {
        id: 'share-fire',
        label: 'Поділити вогонь',
        description: 'Шанс на доброзичливість.',
        baseChance: 0.6,
        successText: 'Тебе приймають до вогню.',
        failText: 'Тебе проганяють.',
        success: { reputation: 1, health: 1, fatigue: -1 },
        fail: { health: -1 },
      },
      {
        id: 'work-night',
        label: 'Працювати вночі',
        description: 'Заробіток ціною виснаження.',
        baseChance: 0.5,
        successText: 'Ти заробляєш, але виснажуєшся.',
        failText: 'Ти змерзаєш і втрачаєш сили.',
        success: { money: 3, health: -1, fatigue: 1 },
        fail: { health: -2, fatigue: 1 },
      },
      {
        id: 'endure-cold',
        label: 'Терпіти',
        description: 'Без витрат, але ризик.',
        baseChance: 0.4,
        successText: 'Ти переживаєш ніч.',
        failText: 'Ти захворюєш.',
        success: {},
        fail: { health: -3 },
      },
    ],
  },
  {
    id: 'harvest-day',
    title: 'Жнива',
    text: 'Селяни шукають робочих рук.',
    choices: [
      {
        id: 'join-harvest',
        label: 'Піти на жнива',
        description: 'Стабільний заробіток.',
        baseChance: 0.85,
        successText: 'Ти працюєш цілий день і отримуєш платню.',
        failText: 'Ти не витримуєш темпу.',
        success: { money: 3 },
        fail: { health: -1 },
      },
      {
        id: 'collect-leftovers',
        label: 'Збирати залишки',
        description: 'Мало грошей, трохи їжі.',
        baseChance: 0.9,
        successText: 'Ти знаходиш їжу і трохи монет.',
        failText: 'Тебе проганяють.',
        success: { money: 1, health: 1 },
        fail: { reputation: -1 },
      },
      {
        id: 'help-foreman',
        label: 'Допомогти бригадиру',
        description: 'Шанс на репутацію.',
        baseChance: 0.6,
        successText: 'Тебе помічають і хвалять.',
        failText: 'Твою роботу критикують.',
        success: { reputation: 2 },
        fail: { reputation: -1 },
      },
      {
        id: 'skip-harvest',
        label: 'Не йти',
        description: 'Без змін.',
        baseChance: 1,
        successText: 'Ти лишаєшся при своєму.',
        failText: 'Ти лишаєшся при своєму.',
        success: {},
        fail: {},
      },
    ],
  },
  {
    id: 'festival-day',
    title: 'Свято в місті',
    text: 'Натовп, музика і можливості.',
    minStage: 'Rising',
    choices: [
      {
        id: 'perform',
        label: 'Виступити перед людьми',
        description: 'Шанс на славу.',
        baseChance: 0.45,
        successText: 'Натовп аплодує твоєму виступу.',
        failText: 'Тебе освистують.',
        success: { reputation: 3 },
        fail: { reputation: -2 },
      },
      {
        id: 'sell-trinkets',
        label: 'Продавати дрібниці',
        description: 'Невеликий прибуток.',
        baseChance: 0.7,
        successText: 'Ти заробляєш на святі.',
        failText: 'Продажі слабкі.',
        success: { money: 3 },
        fail: { money: -1 },
      },
      {
        id: 'watch-guards',
        label: 'Допомагати варті',
        description: 'Репутація за порядок.',
        baseChance: 0.6,
        successText: 'Ти допомагаєш підтримати спокій.',
        failText: 'Тебе відштовхують.',
        success: { reputation: 2 },
        fail: { reputation: -1 },
      },
      {
        id: 'enjoy-festival',
        label: 'Просто відпочити',
        description: 'Відновлення сил.',
        baseChance: 1,
        successText: 'Ти добре відпочиваєш.',
        failText: 'Ти добре відпочиваєш.',
        success: { health: 1, fatigue: -1 },
        fail: {},
      },
    ],
  },
  {
    id: 'debt-collector',
    title: 'Збирач боргів',
    text: 'Хтось вимагає повернути гроші.',
    minStage: 'Established',
    choices: [
      {
        id: 'pay-debt',
        label: 'Заплатити борг',
        description: 'Втрата грошей, збереження репутації.',
        baseChance: 0.8,
        successText: 'Ти чесно розраховуєшся.',
        failText: 'Грошей не вистачає.',
        success: { money: -4, reputation: 2 },
        fail: { reputation: -3 },
      },
      {
        id: 'negotiate-debt',
        label: 'Домовитись про відстрочку',
        description: 'Шанс на компроміс.',
        baseChance: 0.5,
        successText: 'Тобі дають час.',
        failText: 'Збирачі зляться.',
        success: { reputation: 1 },
        fail: { reputation: -2 },
      },
      {
        id: 'hire-muscle',
        label: 'Найняти охорону',
        description: 'Дорого, але безпечно.',
        baseChance: 0.6,
        successText: 'Тебе не чіпають.',
        failText: 'Охорона тікає.',
        success: { money: -3 },
        fail: { health: -2, money: -2 },
      },
      {
        id: 'hide',
        label: 'Сховатися',
        description: 'Ризикована втеча.',
        baseChance: 0.4,
        successText: 'Ти зникаєш на деякий час.',
        failText: 'Тебе знаходять і карають.',
        success: { reputation: -1 },
        fail: { health: -3, reputation: -2 },
      },
    ],
  },
  {
    id: 'river-ferry',
    title: 'Переправа',
    text: 'Човняр бере плату за переправу через річку.',
    choices: [
      {
        id: 'pay-ferry',
        label: 'Заплатити',
        description: 'Безпечно і швидко.',
        baseChance: 0.95,
        successText: 'Ти спокійно перетинаєш річку.',
        failText: 'Човняр зриває плату, але пливе.',
        success: { money: -1 },
        fail: { money: -2 },
      },
      {
        id: 'swim',
        label: 'Плисти самому',
        description: 'Ризиковано, але безкоштовно.',
        baseChance: 0.45,
        successText: 'Ти перетинаєш річку.',
        failText: 'Ти втрачаєш сили в холодній воді.',
        success: {},
        fail: { health: -2 },
      },
      {
        id: 'help-row',
        label: 'Допомогти човняру',
        description: 'Відпрацювати плату.',
        baseChance: 0.7,
        successText: 'Ти відпрацьовуєш переправу.',
        failText: 'Човняр відмовляє.',
        success: { reputation: 1 },
        fail: { reputation: -1 },
      },
      {
        id: 'detour',
        label: 'Обійти',
        description: 'Довше, але без ризику.',
        baseChance: 1,
        successText: 'Ти йдеш обхідним шляхом.',
        failText: 'Ти йдеш обхідним шляхом.',
        success: { fatigue: 1 },
        fail: {},
      },
    ],
  },
  {
    id: 'roadside-shrine',
    title: 'Дорожня каплиця',
    text: 'Мандрівники залишають пожертви й просять благословення.',
    choices: [
      {
        id: 'pray',
        label: 'Помолитися',
        description: 'Спокій і надія.',
        baseChance: 0.9,
        successText: 'Ти відчуваєш полегшення.',
        failText: 'Нічого не змінюється.',
        success: { health: 1 },
        fail: {},
      },
      {
        id: 'donate-coin',
        label: 'Залишити монету',
        description: 'Покращити репутацію.',
        baseChance: 0.8,
        successText: 'Ти отримуєш добре слово.',
        failText: 'Твій жест лишається непоміченим.',
        success: { reputation: 2, money: -1 },
        fail: { money: -1 },
      },
      {
        id: 'guard-shrine',
        label: 'Постояти на варті',
        description: 'Заслужити довіру.',
        baseChance: 0.6,
        successText: 'Тобі дякують мандрівники.',
        failText: 'Ти нудьгуєш без користі.',
        success: { reputation: 1 },
        fail: {},
      },
      {
        id: 'move-on-shrine',
        label: 'Йти далі',
        description: 'Без змін.',
        baseChance: 1,
        successText: 'Ти не затримуєшся.',
        failText: 'Ти не затримуєшся.',
        success: {},
        fail: {},
      },
    ],
  },
  {
    id: 'city-construction',
    title: 'Міське будівництво',
    text: 'Будують стіну, потрібні робітники.',
    choices: [
      {
        id: 'haul-stone',
        label: 'Тягати каміння',
        description: 'Важко, але платять.',
        baseChance: 0.75,
        successText: 'Ти заробляєш на важкій роботі.',
        failText: 'Ти травмуєшся і йдеш.',
        success: { money: 3, fatigue: 1 },
        fail: { health: -2 },
      },
      {
        id: 'mix-mortar',
        label: 'Замішувати розчин',
        description: 'Стабільно і безпечно.',
        baseChance: 0.85,
        successText: 'Ти відпрацьовуєш зміну.',
        failText: 'Розчин псується, тебе сварять.',
        success: { money: 2 },
        fail: { reputation: -1 },
      },
      {
        id: 'talk-foreman',
        label: 'Домовитись з майстром',
        description: 'Шанс на кращу плату.',
        baseChance: 0.4,
        successText: 'Тобі платять більше.',
        failText: 'Тебе відправляють далі.',
        success: { money: 4 },
        fail: { reputation: -1 },
      },
      {
        id: 'skip-site',
        label: 'Не працювати',
        description: 'Без змін.',
        baseChance: 1,
        successText: 'Ти не береш участі.',
        failText: 'Ти не береш участі.',
        success: {},
        fail: {},
      },
    ],
  },
  {
    id: 'fishing-day',
    title: 'Риболовля',
    text: 'Рибаки шукають помічника на світанку.',
    choices: [
      {
        id: 'row-boat',
        label: 'Гребти човном',
        description: 'Важко, але платять.',
        baseChance: 0.7,
        successText: 'Ви повертаєтесь із добрим уловом.',
        failText: 'Риба не клює.',
        success: { money: 2, health: 1 },
        fail: {},
      },
      {
        id: 'mend-nets',
        label: 'Лагодити сіті',
        description: 'Спокійна робота.',
        baseChance: 0.8,
        successText: 'Сіті в порядку, тобі платять.',
        failText: 'Сіті рвуться знову.',
        success: { money: 2 },
        fail: { reputation: -1 },
      },
      {
        id: 'sell-fish',
        label: 'Продати улов',
        description: 'Ризик на ринку.',
        baseChance: 0.5,
        successText: 'Ти продаєш рибу з прибутком.',
        failText: 'Ціни падають.',
        success: { money: 3 },
        fail: { money: -1 },
      },
      {
        id: 'skip-fish',
        label: 'Не йти',
        description: 'Без змін.',
        baseChance: 1,
        successText: 'Ти пропускаєш риболовлю.',
        failText: 'Ти пропускаєш риболовлю.',
        success: {},
        fail: {},
      },
    ],
  },
  {
    id: 'courier-job',
    title: 'Курʼєрська робота',
    text: 'Потрібно доставити лист у сусідній район.',
    choices: [
      {
        id: 'deliver-fast',
        label: 'Швидка доставка',
        description: 'Шанс на репутацію.',
        baseChance: 0.6,
        successText: 'Ти встигаєш вчасно.',
        failText: 'Ти запізнюєшся.',
        success: { reputation: 2, money: 2 },
        fail: { reputation: -1 },
      },
      {
        id: 'deliver-safe',
        label: 'Йти обережно',
        description: 'Менше ризику.',
        baseChance: 0.85,
        successText: 'Ти безпечно доставляєш лист.',
        failText: 'Лист псується.',
        success: { money: 1 },
        fail: { reputation: -1 },
      },
      {
        id: 'peek-letter',
        label: 'Поглянути в лист',
        description: 'Спокуса, але ризик.',
        baseChance: 0.35,
        successText: 'Ти дізнаєшся інформацію.',
        failText: 'Тебе ловлять на місці.',
        success: { skill: 1 },
        fail: { reputation: -2 },
      },
      {
        id: 'refuse-delivery',
        label: 'Відмовитись',
        description: 'Без змін.',
        baseChance: 1,
        successText: 'Ти не береш роботу.',
        failText: 'Ти не береш роботу.',
        success: {},
        fail: {},
      },
    ],
  },
  {
    id: 'barn-fire',
    title: 'Пожежа в сараї',
    text: 'Сусіди просять допомоги.',
    minStage: 'Rising',
    choices: [
      {
        id: 'help-fire',
        label: 'Гасити вогонь',
        description: 'Ризик, але повага.',
        baseChance: 0.5,
        successText: 'Ти рятуєш частину майна.',
        failText: 'Ти обпікаєшся.',
        success: { reputation: 3, health: -1 },
        fail: { health: -3 },
      },
      {
        id: 'save-people',
        label: 'Виводити людей',
        description: 'Шанс на репутацію.',
        baseChance: 0.6,
        successText: 'Ти допомагаєш людям врятуватись.',
        failText: 'Ти не встигаєш.',
        success: { reputation: 2 },
        fail: { reputation: -1 },
      },
      {
        id: 'guard-loot',
        label: 'Охороняти речі',
        description: 'Менше ризику.',
        baseChance: 0.8,
        successText: 'Ти зберігаєш кілька речей.',
        failText: 'Люди сердяться.',
        success: { reputation: 1 },
        fail: { reputation: -1 },
      },
      {
        id: 'ignore-fire',
        label: 'Не втручатись',
        description: 'Без змін.',
        baseChance: 1,
        successText: 'Ти не втручаєшся.',
        failText: 'Ти не втручаєшся.',
        success: {},
        fail: {},
      },
    ],
  },
  {
    id: 'market-inspection',
    title: 'Перевірка на ринку',
    text: 'Сторожа перевіряє ваги і товари.',
    minStage: 'Established',
    choices: [
      {
        id: 'show-license',
        label: 'Показати дозвіл',
        description: 'Чесна гра.',
        baseChance: 0.85,
        successText: 'Тебе залишають у спокої.',
        failText: 'Документи викликають сумніви.',
        success: { reputation: 1 },
        fail: { reputation: -1 },
      },
      {
        id: 'bribe-inspector',
        label: 'Підкупити',
        description: 'Ризиковано.',
        baseChance: 0.4,
        successText: 'Перевірку закривають.',
        failText: 'Тебе ловлять на підкупі.',
        success: { money: -2 },
        fail: { reputation: -3, money: -2 },
      },
      {
        id: 'hide-goods',
        label: 'Сховати товар',
        description: 'Шанс уникнути проблем.',
        baseChance: 0.5,
        successText: 'Ти приховуєш зайве.',
        failText: 'Товар знаходять.',
        success: {},
        fail: { reputation: -2 },
      },
      {
        id: 'close-stall',
        label: 'Закрити прилавок',
        description: 'Без ризику, без прибутку.',
        baseChance: 1,
        successText: 'Ти закриваєшся на день.',
        failText: 'Ти закриваєшся на день.',
        success: { money: -1 },
        fail: {},
      },
    ],
  },
  {
    id: 'militia-drill',
    title: 'Вправи ополчення',
    text: 'Місто тренує ополчення.',
    minStage: 'Rising',
    choices: [
      {
        id: 'join-drill',
        label: 'Приєднатись',
        description: 'Шанс на навички.',
        baseChance: 0.6,
        successText: 'Ти тренуєшся і міцнішаєш.',
        failText: 'Ти відстаєш від інших.',
        success: { skill: 2, reputation: 1 },
        fail: { reputation: -1 },
      },
      {
        id: 'teach-drill',
        label: 'Показати вміння',
        description: 'Ризик, але визнання.',
        baseChance: 0.4,
        successText: 'Твої поради цінують.',
        failText: 'Тебе висміюють.',
        success: { reputation: 2 },
        fail: { reputation: -2 },
      },
      {
        id: 'watch-drill',
        label: 'Спостерігати',
        description: 'Менший ефект.',
        baseChance: 0.8,
        successText: 'Ти вчишся на чужих помилках.',
        failText: 'Ти нічого не виносиш.',
        success: { skill: 1 },
        fail: {},
      },
      {
        id: 'skip-drill',
        label: 'Не йти',
        description: 'Без змін.',
        baseChance: 1,
        successText: 'Ти пропускаєш тренування.',
        failText: 'Ти пропускаєш тренування.',
        success: {},
        fail: {},
      },
    ],
  },
  {
    id: 'bridge-repair',
    title: 'Ремонт мосту',
    text: 'Міст руйнується, потрібні робочі.',
    choices: [
      {
        id: 'carry-wood',
        label: 'Носити дерево',
        description: 'Важко, але платять.',
        baseChance: 0.7,
        successText: 'Ти заробляєш на ремонті.',
        failText: 'Ти виснажуєшся.',
        success: { money: 2, fatigue: 1 },
        fail: { health: -1 },
      },
      {
        id: 'organize-work',
        label: 'Організувати людей',
        description: 'Шанс на репутацію.',
        baseChance: 0.5,
        successText: 'Ти координуєш роботу.',
        failText: 'Тебе не слухають.',
        success: { reputation: 2 },
        fail: { reputation: -1 },
      },
      {
        id: 'repair-tool',
        label: 'Лагодити інструмент',
        description: 'Безпечно.',
        baseChance: 0.8,
        successText: 'Твоя робота корисна.',
        failText: 'Інструмент ламається.',
        success: { skill: 1 },
        fail: {},
      },
      {
        id: 'ignore-bridge',
        label: 'Не втручатись',
        description: 'Без змін.',
        baseChance: 1,
        successText: 'Ти проходиш повз.',
        failText: 'Ти проходиш повз.',
        success: {},
        fail: {},
      },
    ],
  },
  {
    id: 'flood-streets',
    title: 'Повінь на вулицях',
    text: 'Вода заливає квартали.',
    choices: [
      {
        id: 'save-goods',
        label: 'Рятувати товар',
        description: 'Ризик, але прибуток.',
        baseChance: 0.5,
        successText: 'Ти рятуєш частину майна.',
        failText: 'Ти втрачаєш сили.',
        success: { money: 2 },
        fail: { health: -2 },
      },
      {
        id: 'help-neighbors',
        label: 'Допомогти людям',
        description: 'Репутація.',
        baseChance: 0.6,
        successText: 'Тобі дякують.',
        failText: 'Ти не встигаєш.',
        success: { reputation: 2 },
        fail: { reputation: -1 },
      },
      {
        id: 'move-higher',
        label: 'Піти на височину',
        description: 'Безпечно.',
        baseChance: 0.9,
        successText: 'Ти уникаєш небезпеки.',
        failText: 'Ти запізнюєшся.',
        success: {},
        fail: { health: -1 },
      },
      {
        id: 'ignore-flood',
        label: 'Не втручатись',
        description: 'Без змін.',
        baseChance: 1,
        successText: 'Ти лишаєшся осторонь.',
        failText: 'Ти лишаєшся осторонь.',
        success: {},
        fail: {},
      },
    ],
  },
  {
    id: 'refugee-paper',
    title: 'Документи біженця',
    text: 'Потрібно оформити папери.',
    forCharacter: ['refugee'],
    choices: [
      {
        id: 'queue-office',
        label: 'Стати в чергу',
        description: 'Довго, але законно.',
        baseChance: 0.7,
        successText: 'Ти отримуєш дозвіл.',
        failText: 'Тебе відправляють назад.',
        success: { reputation: 2 },
        fail: { reputation: -1 },
      },
      {
        id: 'pay-scribe',
        label: 'Заплатити писарю',
        description: 'Швидше, але дорого.',
        baseChance: 0.6,
        successText: 'Папери готові.',
        failText: 'Гроші зникають.',
        success: { money: -2, reputation: 1 },
        fail: { money: -2 },
      },
      {
        id: 'forge-papers',
        label: 'Підробити документи',
        description: 'Ризик.',
        baseChance: 0.35,
        successText: 'Ти проходиш перевірку.',
        failText: 'Тебе викривають.',
        success: { reputation: 1 },
        fail: { reputation: -3 },
      },
      {
        id: 'avoid-office',
        label: 'Уникати офіційних місць',
        description: 'Без змін.',
        baseChance: 1,
        successText: 'Ти лишаєшся в тіні.',
        failText: 'Ти лишаєшся в тіні.',
        success: {},
        fail: {},
      },
    ],
  },
  {
    id: 'orphan-gang',
    title: 'Вулична банда',
    text: 'Старі знайомі кличуть у справу.',
    forCharacter: ['urchin'],
    choices: [
      {
        id: 'join-gang',
        label: 'Погодитись',
        description: 'Гроші, але ризик.',
        baseChance: 0.5,
        successText: 'Ти отримуєш частку.',
        failText: 'Тебе ловлять.',
        success: { money: 3, reputation: -1 },
        fail: { health: -2, reputation: -2 },
      },
      {
        id: 'refuse-gang',
        label: 'Відмовитись',
        description: 'Безпечніше.',
        baseChance: 1,
        successText: 'Ти тримаєшся осторонь.',
        failText: 'Ти тримаєшся осторонь.',
        success: { reputation: 1 },
        fail: {},
      },
      {
        id: 'warn-guards',
        label: 'Попередити варту',
        description: 'Репутація за допомогу.',
        baseChance: 0.4,
        successText: 'Варта дякує.',
        failText: 'Тебе вважають зрадником.',
        success: { reputation: 2 },
        fail: { reputation: -2 },
      },
      {
        id: 'negotiate-gang',
        label: 'Домовитись про мир',
        description: 'Спроба уникнути конфлікту.',
        baseChance: 0.3,
        successText: 'Тобі дають спокій.',
        failText: 'Тебе залякують.',
        success: { reputation: 1 },
        fail: { health: -1 },
      },
    ],
  },
  {
    id: 'apprentice-test',
    title: 'Іспит майстра',
    text: 'Майстер перевіряє твої вміння.',
    forCharacter: ['apprentice'],
    choices: [
      {
        id: 'take-test',
        label: 'Скласти іспит',
        description: 'Шанс на повагу.',
        baseChance: 0.6,
        successText: 'Майстер задоволений.',
        failText: 'Ти робиш помилки.',
        success: { skill: 2, reputation: 2 },
        fail: { reputation: -1 },
      },
      {
        id: 'ask-help',
        label: 'Попросити допомоги',
        description: 'Менше ризику.',
        baseChance: 0.8,
        successText: 'Тобі підказують.',
        failText: 'Тебе сварять.',
        success: { skill: 1 },
        fail: { reputation: -1 },
      },
      {
        id: 'delay-test',
        label: 'Відкласти',
        description: 'Без змін.',
        baseChance: 1,
        successText: 'Ти переносиш іспит.',
        failText: 'Ти переносиш іспит.',
        success: {},
        fail: {},
      },
      {
        id: 'prove-independent',
        label: 'Показати самостійність',
        description: 'Ризик і шанс.',
        baseChance: 0.4,
        successText: 'Майстер вражений.',
        failText: 'Ти псуєш роботу.',
        success: { skill: 2, money: 1 },
        fail: { reputation: -2 },
      },
    ],
  },
  {
    id: 'farmer-harvest',
    title: 'Сільська рада',
    text: 'Селяни вирішують питання громади.',
    forCharacter: ['farmer'],
    choices: [
      {
        id: 'speak-up',
        label: 'Виступити',
        description: 'Шанс на повагу.',
        baseChance: 0.6,
        successText: 'Твою думку підтримують.',
        failText: 'Тебе не слухають.',
        success: { reputation: 2 },
        fail: { reputation: -1 },
      },
      {
        id: 'organize-work',
        label: 'Організувати роботу',
        description: 'Практична користь.',
        baseChance: 0.7,
        successText: 'Громада дякує.',
        failText: 'Люди незадоволені.',
        success: { reputation: 1, money: 1 },
        fail: { reputation: -1 },
      },
      {
        id: 'stay-quiet',
        label: 'Мовчати',
        description: 'Без ризику.',
        baseChance: 1,
        successText: 'Ти не втручаєшся.',
        failText: 'Ти не втручаєшся.',
        success: {},
        fail: {},
      },
      {
        id: 'support-elder',
        label: 'Підтримати старосту',
        description: 'Лояльність.',
        baseChance: 0.8,
        successText: 'Староста віддячує.',
        failText: 'Тебе ігнорують.',
        success: { reputation: 1 },
        fail: {},
      },
    ],
  },
  {
    id: 'forest-foraging',
    title: 'Збір у лісі',
    text: 'У лісі можна знайти трави й ягоди.',
    choices: [
      {
        id: 'gather-herbs',
        label: 'Збирати трави',
        description: 'Шанс на користь.',
        baseChance: 0.7,
        successText: 'Ти знаходиш лікувальні трави.',
        failText: 'Ти марнуєш час.',
        success: { health: 1, money: 1 },
        fail: {},
      },
      {
        id: 'hunt-small',
        label: 'Полювати на дрібну дичину',
        description: 'Ризик, але можлива їжа.',
        baseChance: 0.45,
        successText: 'Ти приносиш їжу.',
        failText: 'Ти повертаєшся ні з чим.',
        success: { health: 1 },
        fail: { fatigue: 1 },
      },
      {
        id: 'sell-wood',
        label: 'Зібрати хмиз на продаж',
        description: 'Невеликий прибуток.',
        baseChance: 0.8,
        successText: 'Ти продаєш хмиз.',
        failText: 'Покупців мало.',
        success: { money: 2 },
        fail: {},
      },
      {
        id: 'leave-forest',
        label: 'Не ризикувати',
        description: 'Без змін.',
        baseChance: 1,
        successText: 'Ти не заходиш глибоко.',
        failText: 'Ти не заходиш глибоко.',
        success: {},
        fail: {},
      },
    ],
  },
  {
    id: 'town-crier',
    title: 'Міський глашатай',
    text: 'Потрібна людина, щоб оголошувати новини.',
    choices: [
      {
        id: 'take-crier',
        label: 'Стати глашатаєм',
        description: 'Голос і репутація.',
        baseChance: 0.6,
        successText: 'Тебе чують на площі.',
        failText: 'Тебе висміюють.',
        success: { reputation: 2, money: 1 },
        fail: { reputation: -1 },
      },
      {
        id: 'help-prepare',
        label: 'Допомагати з оголошеннями',
        description: 'Менший ефект.',
        baseChance: 0.8,
        successText: 'Ти допомагаєш і отримуєш дрібну платню.',
        failText: 'Тобі не довіряють.',
        success: { money: 1 },
        fail: { reputation: -1 },
      },
      {
        id: 'rewrite-message',
        label: 'Підправити текст',
        description: 'Ризиковано.',
        baseChance: 0.35,
        successText: 'Твій текст подобається людям.',
        failText: 'Тебе сварять.',
        success: { reputation: 2 },
        fail: { reputation: -2 },
      },
      {
        id: 'ignore-crier',
        label: 'Ігнорувати',
        description: 'Без змін.',
        baseChance: 1,
        successText: 'Ти йдеш далі.',
        failText: 'Ти йдеш далі.',
        success: {},
        fail: {},
      },
    ],
  },
  {
    id: 'caravan-escort',
    title: 'Охорона каравану',
    text: 'Торговці шукають супровід.',
    minStage: 'Rising',
    choices: [
      {
        id: 'join-escort',
        label: 'Приєднатись',
        description: 'Ризик, але добре платять.',
        baseChance: 0.55,
        successText: 'Караван безпечно доходить.',
        failText: 'Караван атакують.',
        success: { money: 4, reputation: 1 },
        fail: { health: -3, money: -1 },
      },
      {
        id: 'guard-night',
        label: 'Нічна варта',
        description: 'Втома, але стабільно.',
        baseChance: 0.7,
        successText: 'Ти витримуєш ніч.',
        failText: 'Ти засинаєш на посту.',
        success: { money: 2, fatigue: 1 },
        fail: { reputation: -1 },
      },
      {
        id: 'coach-driver',
        label: 'Допомогти водієві',
        description: 'Безпечно.',
        baseChance: 0.8,
        successText: 'Ти допомагаєш у дорозі.',
        failText: 'Ти губишся.',
        success: { money: 2 },
        fail: { health: -1 },
      },
      {
        id: 'decline-escort',
        label: 'Відмовитись',
        description: 'Без змін.',
        baseChance: 1,
        successText: 'Ти не береш роботу.',
        failText: 'Ти не береш роботу.',
        success: {},
        fail: {},
      },
    ],
  },
  {
    id: 'warehouse-night',
    title: 'Ніч у складі',
    text: 'Склад потребує нагляду вночі.',
    choices: [
      {
        id: 'night-guard',
        label: 'Чергувати',
        description: 'Платять, але виснажує.',
        baseChance: 0.65,
        successText: 'Ніч проходить спокійно.',
        failText: 'Ти засинаєш на посту.',
        success: { money: 2, fatigue: 1 },
        fail: { reputation: -1 },
      },
      {
        id: 'repair-door',
        label: 'Полагодити двері',
        description: 'Спокійна робота.',
        baseChance: 0.8,
        successText: 'Твоя робота корисна.',
        failText: 'Ти псуєш інструмент.',
        success: { skill: 1 },
        fail: {},
      },
      {
        id: 'call-friends',
        label: 'Покликати допомогу',
        description: 'Менше ризику.',
        baseChance: 0.7,
        successText: 'Вас двоє, усе спокійно.',
        failText: 'Ти чекаєш даремно.',
        success: { reputation: 1 },
        fail: {},
      },
      {
        id: 'refuse-warehouse',
        label: 'Відмовитись',
        description: 'Без змін.',
        baseChance: 1,
        successText: 'Ти відмовляєшся.',
        failText: 'Ти відмовляєшся.',
        success: {},
        fail: {},
      },
    ],
  },
];

const events: WorldEvent[] = [
  {
    id: 'good-harvest',
    title: 'Добрий урожай',
    text: 'Ціни на зерно падають. Їжа дешевшає.',
    effects: { money: 2, health: 1 },
  },
  {
    id: 'market-fraud',
    title: 'Ринкове шахрайство',
    text: 'Тебе обманюють на вазі. Частина грошей зникає.',
    effects: { money: -3, reputation: -1 },
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
    effects: { money: 4, reputation: 2 },
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
    effects: { money: -2, health: -1 },
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
    effects: { money: 3, reputation: -1 },
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
    effects: { money: 1, skill: 1 },
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

const stageIndex: Record<Stage, number> = {
  Early: 0,
  Rising: 1,
  Established: 2,
  Noble: 3,
};

const stageLabel = (stats: Stats): Stage => {
  if (stats.money >= 50 && stats.reputation >= 30) return 'Noble';
  if (stats.money >= 25 && stats.reputation >= 15) return 'Established';
  if (stats.money >= 10 || stats.reputation >= 8) return 'Rising';
  return 'Early';
};

const stageUa: Record<Stage, string> = {
  Early: 'Початок',
  Rising: 'Підйом',
  Established: 'Становлення',
  Noble: 'Шляхта',
};

const applyEffects = (stats: Stats, effects: Effects): Stats => ({
  money: stats.money + (effects.money ?? 0),
  reputation: stats.reputation + (effects.reputation ?? 0),
  skill: stats.skill + (effects.skill ?? 0),
  health: stats.health + (effects.health ?? 0),
  age: stats.age + (effects.age ?? 0),
  family: stats.family + (effects.family ?? 0),
  hungerDebt: stats.hungerDebt + (effects.hungerDebt ?? 0),
  fatigue: stats.fatigue + (effects.fatigue ?? 0),
});

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const buildSceneDeck = () => {
  const buckets: Record<Stage, Scene[]> = {
    Early: [],
    Rising: [],
    Established: [],
    Noble: [],
  };
  scenes.forEach((scene) => {
    const stage = scene.minStage ?? 'Early';
    buckets[stage].push(scene);
  });
  return [
    ...shuffle(buckets.Early),
    ...shuffle(buckets.Rising),
    ...shuffle(buckets.Established),
    ...shuffle(buckets.Noble),
  ];
};

const getNextScene = (
  deck: Scene[],
  startIndex: number,
  stage: Stage,
  characterId?: string | null
) => {
  let fallback: { scene: Scene; index: number } | null = null;
  for (let i = startIndex; i < deck.length; i += 1) {
    const scene = deck[i];
    if (scene.forCharacter && characterId && !scene.forCharacter.includes(characterId)) {
      continue;
    }
    if (!fallback) {
      fallback = { scene, index: i };
    }
    if (!scene.minStage) return { scene, index: i };
    if (stageIndex[stage] >= stageIndex[scene.minStage]) {
      return { scene, index: i };
    }
  }
  return fallback;
};

const initialSceneDeck = buildSceneDeck();
const initialEventDeck = shuffle(events);
const defaultStats: Stats = {
  money: 0,
  reputation: 0,
  skill: 0,
  health: 10,
  age: 16,
  family: 0,
  hungerDebt: 0,
  fatigue: 0,
};

const getChance = (choice: Choice, stats: Stats) => {
  const penalty = stats.money < 0 ? Math.abs(stats.money) * 0.01 : 0;
  const modifier =
    stats.skill * 0.04 +
    stats.reputation * 0.015 +
    stats.health * 0.01 -
    stats.money * 0.003 -
    stats.fatigue * 0.03 -
    penalty;
  return clamp(choice.baseChance + modifier, 0.1, 0.95);
};

const getEnding = (stats: Stats, reason: string) => {
  if (stats.health <= 0) {
    return {
      title: 'Смерть',
      text: `${reason} Ти помираєш від виснаження та травм.`,
    };
  }

  if (stats.money >= 55 && stats.reputation >= 35) {
    return {
      title: 'Феодал',
      text: `${reason} Ти завершуєш життя впливовим феодалом із землею та владою.`,
    };
  }
  if (stats.money >= 35 && stats.reputation >= 15) {
    return {
      title: 'Купець',
      text: `${reason} Ти стаєш заможним купцем із власною справою.`,
    };
  }
  if (stats.skill >= 12 && stats.reputation >= 12) {
    return {
      title: 'Лицар',
      text: `${reason} Ти здобуваєш славу і завершуєш життя як лицар або воїн.`,
    };
  }
  if (stats.reputation >= 18 && stats.money <= 10) {
    return {
      title: 'Монах',
      text: `${reason} Ти відходиш від мирського й стаєш монахом.`,
    };
  }

  const best = Math.max(stats.money, stats.skill, stats.reputation);
  if (best === stats.money) {
    return {
      title: 'Купець',
      text: `${reason} Ти йдеш шляхом торгівлі й стаєш купцем.`,
    };
  }
  if (best === stats.skill) {
    return {
      title: 'Лицар',
      text: `${reason} Твоя сила веде тебе шляхом воїна.`,
    };
  }
  if (best === stats.reputation) {
    return {
      title: 'Монах',
      text: `${reason} Ти обираєш служіння й тишу.`,
    };
  }

  return {
    title: 'Смерть',
    text: `${reason} Ти помираєш бідним і майже забутим.`,
  };
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [turn, setTurn] = useState(1);
  const [log, setLog] = useState<string[]>([]);
  const stage = stageLabel(stats);
  const [sceneDeck, setSceneDeck] = useState<Scene[]>(() => initialSceneDeck);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [scene, setScene] = useState<Scene>(() => {
    const next = getNextScene(initialSceneDeck, 0, stage, selectedCharacter?.id);
    return next?.scene ?? initialSceneDeck[0];
  });
  const [gameOver, setGameOver] = useState(false);
  const [endingReason, setEndingReason] = useState<string>('');
  const [screen, setScreen] = useState<'start' | 'choose' | 'game'>('start');
  const [result, setResult] = useState<{
    title: string;
    text: string;
    deltas: Effects;
    event?: WorldEvent;
  } | null>(null);
  const [eventDeck, setEventDeck] = useState<WorldEvent[]>(() => initialEventDeck);
  const [eventIndex, setEventIndex] = useState(0);
  const characterListRef = useRef<FlatList<Character>>(null);
  const characterScrollX = useRef(new Animated.Value(0)).current;
  const [detailCharacter, setDetailCharacter] = useState<Character | null>(null);
  const [choiceDetail, setChoiceDetail] = useState<{ choice: Choice; chance: number } | null>(
    null
  );

  const chanceMap = useMemo(() => {
    return scene.choices.reduce<Record<string, number>>((acc, choice) => {
      acc[choice.id] = getChance(choice, stats);
      return acc;
    }, {});
  }, [scene, stats]);

  const handleChoice = (choice: Choice) => {
    if (gameOver) return;
    if (choice.minHealth && stats.health < choice.minHealth) return;
    const chance = chanceMap[choice.id];
    const success = Math.random() < chance;
    const effects = success ? choice.success : choice.fail;
    const adjustedEffects = { ...effects };
    if (success && adjustedEffects.money && adjustedEffects.money > 0) {
      const bonus = Math.min(2, Math.floor(stats.skill / 5));
      adjustedEffects.money += bonus;
    }
    const afterChoice = applyEffects(stats, adjustedEffects);
    const upkeep = BASE_UPKEEP - afterChoice.family;
    const upkeepEffects: Effects = { money: upkeep };
    const nextStats = applyEffects(afterChoice, upkeepEffects);
    nextStats.age += 1;
    const nextStage = stageLabel(nextStats);
    const resultText = success ? choice.successText : choice.failText;
    let resultLine = `Хід ${turn}: ${resultText} (утримання ${upkeep})`;

    const nextTurn = turn + 1;
    let eventResult: WorldEvent | undefined;
    if (nextTurn % EVENT_EVERY_TURNS === 0) {
      const deck = eventIndex >= eventDeck.length ? shuffle(events) : eventDeck;
      const index = eventIndex >= eventDeck.length ? 0 : eventIndex;
      if (deck !== eventDeck) {
        setEventDeck(deck);
        setEventIndex(index);
      }
      const currentEvent = deck[index];
      eventResult = currentEvent;
      const updated = applyEffects(nextStats, currentEvent.effects);
      nextStats.money = updated.money;
      nextStats.reputation = updated.reputation;
      nextStats.skill = updated.skill;
      nextStats.health = updated.health;
      nextStats.age = updated.age;
      setEventIndex((prev) => prev + 1);
      setLog((prev) => [
        `Подія: ${currentEvent.title}. ${currentEvent.text}`,
        ...prev,
      ].slice(0, 6));
    }

    const beforeHunger = nextStats.hungerDebt;
    const beforeFatigue = nextStats.fatigue;
    let hungerDelta = 0;
    let fatigueDelta = 0;
    let hungerHealthLoss = 0;
    if (nextStats.money <= 0) {
      nextStats.hungerDebt += 1;
      hungerDelta = 1;
      hungerHealthLoss = nextStats.hungerDebt;
      nextStats.health -= hungerHealthLoss;
      resultLine += `, голод -${hungerHealthLoss}`;
    } else if (nextStats.hungerDebt > 0) {
      const pay = Math.min(nextStats.money, nextStats.hungerDebt);
      nextStats.money -= pay;
      nextStats.hungerDebt -= pay;
      hungerDelta = -pay;
      if (pay > 0) {
        resultLine += `, їжа -${pay}`;
      }
    }

    nextStats.fatigue += 1;
    if (nextStats.fatigue < 0) nextStats.fatigue = 0;
    if (nextStats.fatigue >= 6) {
      nextStats.health -= 1;
      resultLine += ', втома -1 здоровʼя';
    }
    fatigueDelta = nextStats.fatigue - beforeFatigue;

    let lifeOver = nextStats.health <= 0 || nextTurn > MAX_TURNS;
    if (nextStats.health <= 0) {
      if (nextStats.hungerDebt > 0) {
        setEndingReason('Голод виснажив тебе до межі.');
      } else {
        setEndingReason(
          'Твоє здоровʼя впало до нуля через виснаження, травми та наслідки рішень.'
        );
      }
    } else if (nextTurn > MAX_TURNS) {
      setEndingReason('Твоє життя добігло кінця після повного циклу ходів.');
    }
    const nextScenePick = lifeOver
      ? null
      : getNextScene(sceneDeck, sceneIndex + 1, nextStage, selectedCharacter?.id);
    if (!lifeOver && !nextScenePick) {
      lifeOver = true;
      setEndingReason('Ти пройшов усі 18 кроків життя.');
    }
    const nextScene = nextScenePick?.scene ?? scene;

    setStats(nextStats);
    setTurn(nextTurn);
    setLog((prev) => [resultLine, ...prev].slice(0, 6));
    if (nextScenePick) {
      setScene(nextScenePick.scene);
      setSceneIndex(nextScenePick.index);
    } else {
      setScene(nextScene);
    }
    setGameOver(lifeOver);
    setResult({
      title: success ? 'Успіх' : 'Невдача',
      text: resultText,
      deltas: {
        ...adjustedEffects,
        money: (adjustedEffects.money ?? 0) + upkeep,
        hungerDebt: hungerDelta,
        fatigue: fatigueDelta,
      },
      event: eventResult,
    });
  };

  const handleStart = () => {
    if (!selectedCharacter) return;
    const startingStats = { ...selectedCharacter.stats };
    const startingStage = stageLabel(startingStats);
    setStats(startingStats);
    setTurn(1);
    setLog([]);
    const freshSceneDeck = buildSceneDeck();
    const firstScene = getNextScene(freshSceneDeck, 0, startingStage, selectedCharacter.id);
    setSceneDeck(freshSceneDeck);
    setSceneIndex(firstScene?.index ?? 0);
    setScene(firstScene?.scene ?? freshSceneDeck[0]);
    setEventDeck(shuffle(events));
    setEventIndex(0);
    setGameOver(false);
    setResult(null);
    setScreen('game');
  };

  const resetLife = () => {
    const resetStats = selectedCharacter ? { ...selectedCharacter.stats } : { ...defaultStats };
    const resetStage = stageLabel(resetStats);
    setStats(resetStats);
    setTurn(1);
    setLog([]);
    const freshSceneDeck = buildSceneDeck();
    const firstScene = getNextScene(
      freshSceneDeck,
      0,
      resetStage,
      selectedCharacter?.id
    );
    setSceneDeck(freshSceneDeck);
    setSceneIndex(firstScene?.index ?? 0);
    setScene(firstScene?.scene ?? freshSceneDeck[0]);
    setGameOver(false);
    setScreen('choose');
    setResult(null);
    setEventDeck(shuffle(events));
    setEventIndex(0);
    setDetailCharacter(null);
    setEndingReason('');
  };

  const exitToStart = () => {
    setStats(defaultStats);
    setTurn(1);
    setLog([]);
    const freshDeck = buildSceneDeck();
    setSceneDeck(freshDeck);
    setSceneIndex(0);
    setScene(freshDeck[0]);
    setGameOver(false);
    setScreen('start');
    setResult(null);
    setEventDeck(shuffle(events));
    setEventIndex(0);
    setSelectedCharacter(null);
    setDetailCharacter(null);
    setEndingReason('');
  };

  if (screen === 'start') {
    return (
      <ThemedView style={[styles.screen, { paddingTop: Math.max(12, insets.top + 6) }]}>
        <View style={styles.startHeroCompact}>
          <ThemedText type="title">Only One Life</ThemedText>
          <ThemedText style={styles.startText}>
            Одна спроба. Одне життя. Ніяких перезавантажень.
          </ThemedText>
          <View style={styles.startCard}>
            <ThemedText type="defaultSemiBold">Що на тебе чекає</ThemedText>
            <ThemedText style={styles.startBullet}>• Жорсткі вибори й наслідки</ThemedText>
            <ThemedText style={styles.startBullet}>• Ймовірності залежать від стану</ThemedText>
            <ThemedText style={styles.startBullet}>• Фінал — не бал, а роль у світі</ThemedText>
          </View>
          <Pressable onPress={() => setScreen('choose')} style={styles.primaryButton}>
            <ThemedText style={styles.primaryButtonText}>Старт</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (screen === 'choose') {
    const { width } = Dimensions.get('window');
    const cardWidth = Math.min(width - 64, 300);
    const cardGap = 12;
    const snapInterval = cardWidth + cardGap;
    return (
      <ThemedView
        style={[
          styles.screen,
          styles.screenCompact,
          { paddingTop: Math.max(12, insets.top + 6) },
        ]}>
        <View style={styles.startHeroCompact}>
          <ThemedText type="title">Обери персонажа</ThemedText>
          <ThemedText style={styles.startText}>
            Стартові стати визначають твої перші шанси.
          </ThemedText>
          <View style={styles.carouselWrap}>
            <Animated.FlatList
              ref={characterListRef}
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
                [{ nativeEvent: { contentOffset: { x: characterScrollX } } }],
                { useNativeDriver: true }
              )}
              scrollEventThrottle={16}
              getItemLayout={(_, index) => ({
                length: snapInterval,
                offset: snapInterval * index,
                index,
              })}
              renderItem={({ item, index }) => {
                const active = item.id === selectedCharacter?.id;
                const inputRange = [
                  (index - 1) * snapInterval,
                  index * snapInterval,
                  (index + 1) * snapInterval,
                ];
                const scale = characterScrollX.interpolate({
                  inputRange,
                  outputRange: [0.96, 1, 0.96],
                  extrapolate: 'clamp',
                });
                const opacity = characterScrollX.interpolate({
                  inputRange,
                  outputRange: [0.7, 1, 0.7],
                  extrapolate: 'clamp',
                });
                return (
                  <Pressable
                    onPress={() => setSelectedCharacter(item)}
                    style={[
                      styles.characterCard,
                      { width: cardWidth, marginRight: cardGap },
                      active && styles.characterCardActive,
                    ]}>
                    <View style={styles.characterHeader}>
                      <ThemedText type="defaultSemiBold" style={styles.characterName}>
                        {item.name}
                      </ThemedText>
                      <View style={styles.roleChip}>
                        <ThemedText style={styles.roleChipText}>Старт</ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.characterDesc}>{item.description}</ThemedText>
                    <View style={styles.characterStats}>
                      <StatPill label="Гроші" value={item.stats.money} />
                      <StatPill label="Репутація" value={item.stats.reputation} />
                      <StatPill label="Сила" value={item.stats.skill} />
                      <StatPill label="Здоровʼя" value={item.stats.health} />
                    </View>
                    <Pressable onPress={() => setDetailCharacter(item)} style={styles.selectButton}>
                      <ThemedText style={styles.selectButtonText}>Деталі</ThemedText>
                    </Pressable>
                  </Pressable>
                );
              }}
            />
          </View>
          <Pressable
            onPress={handleStart}
            style={[styles.primaryButton, !selectedCharacter && styles.primaryButtonDisabled]}
            disabled={!selectedCharacter}>
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
            const scale = characterScrollX.interpolate({
              inputRange,
              outputRange: [0.9, 1.05, 0.9],
              extrapolate: 'clamp',
            });
            const opacity = characterScrollX.interpolate({
              inputRange,
              outputRange: [0, 1, 0],
              extrapolate: 'clamp',
            });
            return (
              <Animated.Image
                key={item.id}
                source={item.image}
                style={[
                  styles.characterPreview,
                  { transform: [{ scale }], opacity },
                ]}
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
                <ThemedText style={styles.resultText}>{detailCharacter.lore}</ThemedText>
              </View>
              <View style={styles.deltaList}>
                <StatRow label="Гроші" value={detailCharacter.stats.money} />
                <StatRow label="Репутація" value={detailCharacter.stats.reputation} />
                <StatRow label="Сила/Вміння" value={detailCharacter.stats.skill} />
                <StatRow label="Здоровʼя" value={detailCharacter.stats.health} />
              </View>
              <View style={styles.choiceList}>
                <Pressable
                  onPress={() => {
                    setSelectedCharacter(detailCharacter);
                    setDetailCharacter(null);
                  }}
                  style={styles.resultButton}>
                  <ThemedText style={styles.resultButtonText}>Обрати цього персонажа</ThemedText>
                </Pressable>
                <Pressable onPress={() => setDetailCharacter(null)} style={styles.secondaryButton}>
                  <ThemedText style={styles.secondaryButtonText}>Закрити</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </ThemedView>
    );
  }

  return (
    <View style={styles.gameScreen}>
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.header}>
        <ThemedText type="defaultSemiBold" style={styles.headerSubtitle}>
          Хід {Math.min(turn, MAX_TURNS)} / {MAX_TURNS} · Етап: {stageUa[stage]}
        </ThemedText>
        <View style={styles.statsHeader}>
          <StatInline label="Гроші" value={stats.money} />
          <StatInline label="Репутація" value={stats.reputation} />
          <StatInline label="Сила" value={stats.skill} />
          <StatInline label="Здоровʼя" value={stats.health} />
          <StatInline label="Голод" value={stats.hungerDebt} />
          <StatInline label="Втома" value={stats.fatigue} />
          <StatInline label="Вік" value={stats.age} />
          <StatInline label="Сімʼя" value={stats.family} />
        </View>
      </ThemedView>
      {selectedCharacter ? (
        <ThemedView style={styles.heroCard}>
          <Image source={selectedCharacter.image} style={styles.heroImage} />
        </ThemedView>
      ) : null}


      <ThemedView style={styles.section}>
        <ThemedText type="defaultSemiBold">Сцена</ThemedText>
        <ThemedView style={styles.sceneCard}>
          {gameOver ? (
            <View style={styles.ending}>
              {(() => {
                const ending = getEnding(stats, endingReason);
                return (
                  <>
                    <ThemedText type="defaultSemiBold" style={styles.endingTitle}>
                      {ending.title}
                    </ThemedText>
                    <ThemedText>{ending.text}</ThemedText>
                  </>
                );
              })()}
              <Pressable onPress={resetLife} style={styles.primaryButton}>
                <ThemedText style={styles.primaryButtonText}>Почати інше життя</ThemedText>
              </Pressable>
              <Pressable onPress={exitToStart} style={styles.secondaryButton}>
                <ThemedText style={styles.secondaryButtonText}>Вийти</ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              <ThemedText type="subtitle">{scene.title}</ThemedText>
              <ThemedText style={styles.sceneText}>{scene.text}</ThemedText>
              <View style={styles.choiceGrid}>
                {scene.choices.map((choice) => {
                  const chance = Math.round(chanceMap[choice.id] * 100);
                  return (
                  <View key={choice.id} style={styles.choiceRow}>
                    <View style={styles.choiceRowText}>
                      <ThemedText type="defaultSemiBold">{choice.label}</ThemedText>
                      <ThemedText style={styles.choiceChance}>Шанс: ~{chance}%</ThemedText>
                    </View>
                    {choice.minHealth && stats.health < choice.minHealth ? (
                      <ThemedText style={styles.choiceLockedText}>
                        Потрібно здоровʼя {choice.minHealth}
                      </ThemedText>
                    ) : null}
                    <Pressable
                      onPress={() => handleChoice(choice)}
                      disabled={!!choice.minHealth && stats.health < choice.minHealth}
                      style={styles.choicePickCorner}>
                      <ThemedText style={styles.choicePickCornerText}>✓</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => setChoiceDetail({ choice, chance })}
                      style={styles.choiceDetailButton}>
                      <ThemedText style={styles.choiceDetailText}>Деталі</ThemedText>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            </>
          )}
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="defaultSemiBold">Останні наслідки</ThemedText>
        <ThemedView style={styles.logCard}>
          {log.length === 0 ? (
            <ThemedText style={styles.logEmpty}>Ще немає наслідків.</ThemedText>
          ) : (
            log.map((entry) => (
              <ThemedText key={entry} style={styles.logEntry}>
                {entry}
              </ThemedText>
            ))
          )}
        </ThemedView>
      </ThemedView>
      </ScrollView>
      {result ? (
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <ThemedText type="subtitle" style={styles.resultTitle}>
                {result.title}
              </ThemedText>
              <ThemedText style={styles.resultText}>{result.text}</ThemedText>
            </View>
            <View style={styles.deltaList}>
              <Delta label="Гроші" value={result.deltas.money ?? 0} />
              <Delta label="Репутація" value={result.deltas.reputation ?? 0} />
              <Delta label="Сила/Вміння" value={result.deltas.skill ?? 0} />
              <Delta label="Здоровʼя" value={result.deltas.health ?? 0} />
              <Delta label="Сімʼя" value={result.deltas.family ?? 0} />
              <Delta label="Голод" value={result.deltas.hungerDebt ?? 0} />
              <Delta label="Втома" value={result.deltas.fatigue ?? 0} />
            </View>
            {result.event ? (
              <View style={styles.eventBox}>
                <ThemedText type="defaultSemiBold" style={styles.eventTitle}>
                  {result.event.title}
                </ThemedText>
                <ThemedText style={styles.eventText}>{result.event.text}</ThemedText>
                <View style={styles.deltaList}>
                  <Delta label="Гроші" value={result.event.effects.money ?? 0} />
                  <Delta label="Репутація" value={result.event.effects.reputation ?? 0} />
                  <Delta label="Сила/Вміння" value={result.event.effects.skill ?? 0} />
                  <Delta label="Здоровʼя" value={result.event.effects.health ?? 0} />
                  <Delta label="Сімʼя" value={result.event.effects.family ?? 0} />
                </View>
              </View>
            ) : null}
            <Pressable onPress={() => setResult(null)} style={styles.resultButton}>
              <ThemedText style={styles.resultButtonText}>Продовжити</ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}
      {choiceDetail ? (
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <ThemedText type="subtitle" style={styles.resultTitle}>
                {choiceDetail.choice.label}
              </ThemedText>
              <ThemedText style={styles.resultText}>{choiceDetail.choice.description}</ThemedText>
            </View>
            <ThemedText style={styles.choiceChance}>Шанс: ~{choiceDetail.chance}%</ThemedText>
            <View style={styles.deltaList}>
              <ThemedText type="defaultSemiBold" style={styles.modalSectionTitle}>
                Успіх
              </ThemedText>
              {choiceDetail.choice.minHealth ? (
                <ThemedText style={styles.choiceLockedText}>
                  Мін. здоровʼя: {choiceDetail.choice.minHealth}
                </ThemedText>
              ) : null}
              <Delta label="Гроші" value={choiceDetail.choice.success.money ?? 0} />
              <Delta label="Репутація" value={choiceDetail.choice.success.reputation ?? 0} />
              <Delta label="Сила/Вміння" value={choiceDetail.choice.success.skill ?? 0} />
              <Delta label="Здоровʼя" value={choiceDetail.choice.success.health ?? 0} />
              <Delta label="Сімʼя" value={choiceDetail.choice.success.family ?? 0} />
              <ThemedText style={styles.resultText}>{choiceDetail.choice.successText}</ThemedText>
            </View>
            <View style={styles.deltaList}>
              <ThemedText type="defaultSemiBold" style={styles.modalSectionTitle}>
                Невдача
              </ThemedText>
              <Delta label="Гроші" value={choiceDetail.choice.fail.money ?? 0} />
              <Delta label="Репутація" value={choiceDetail.choice.fail.reputation ?? 0} />
              <Delta label="Сила/Вміння" value={choiceDetail.choice.fail.skill ?? 0} />
              <Delta label="Здоровʼя" value={choiceDetail.choice.fail.health ?? 0} />
              <Delta label="Сімʼя" value={choiceDetail.choice.fail.family ?? 0} />
              <ThemedText style={styles.resultText}>{choiceDetail.choice.failText}</ThemedText>
            </View>
            <Pressable onPress={() => setChoiceDetail(null)} style={styles.resultButton}>
              <ThemedText style={styles.resultButtonText}>Закрити</ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statItem}>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.statValue}>
        {value}
      </ThemedText>
    </View>
  );
}

function StatInline({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statInline}>
      <ThemedText style={styles.statInlineLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.statInlineValue}>
        {value}
      </ThemedText>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.miniStat}>
      <ThemedText style={styles.miniStatLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold">{value}</ThemedText>
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statPill}>
      <ThemedText style={styles.statPillLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.statPillValue}>
        {value}
      </ThemedText>
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.deltaRow}>
      <ThemedText style={styles.deltaLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.deltaValue}>
        {value}
      </ThemedText>
    </View>
  );
}

function Delta({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  const sign = value > 0 ? '+' : '';
  return (
    <View style={styles.deltaRow}>
      <ThemedText style={styles.deltaLabel}>{label}</ThemedText>
      <ThemedText style={value > 0 ? styles.deltaPositive : styles.deltaNegative}>
        {sign}
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: {
    color: '#F6E7C8',
  },
  headerSubtitle: {
    color: 'rgba(246,231,200,0.8)',
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
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
});
