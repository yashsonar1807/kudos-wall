/**
 * System Constants for Kudos Wall Platform
 * Centralized enumeration and business logic rules
 */

const DEPARTMENTS = [
  'Engineering',
  'Design',
  'Marketing',
  'Sales',
  'Product',
  'Operations',
  'HR',
  'Finance',
];

const COMPANY_VALUE_TAGS = [
  '#Teamwork',
  '#CustomerObsession',
  '#Innovation',
  '#Excellence',
  '#Integrity',
  '#Leadership',
];

const REACTION_TYPES = ['+1', '👏', '🔥', '❤️', '🚀', '🎉'];

const BADGE_CATEGORIES = ['milestone', 'values', 'giving', 'receiving'];

const TRANSACTION_TYPES = [
  'ALLOWANCE_MONTHLY_RESET',
  'KUDOS_SENT',
  'KUDOS_RECEIVED',
  'REWARD_REDEMPTION',
  'ADMIN_ADJUSTMENT',
];

const WALLET_TYPES = ['givingAllowance', 'earnedPoints'];

const POINT_TIERS = [10, 20, 50];

const DEFAULT_MONTHLY_ALLOWANCE = 100;
const DEFAULT_EARNED_POINTS = 0;

/**
 * Predefined System Badges for Milestones and Company Values Recognition
 */
const SYSTEM_BADGES = [
  {
    name: 'First Kudos Sent',
    code: 'FIRST_KUDOS_SENT',
    description: 'Celebrated a peer by sending your first kudos recognition',
    icon: 'sparkles',
    category: 'giving',
    pointsBonus: 5,
  },
  {
    name: 'First Kudos Received',
    code: 'FIRST_KUDOS_RECEIVED',
    description: 'Received your first kudos recognition from a teammate',
    icon: 'award',
    category: 'receiving',
    pointsBonus: 10,
  },
  {
    name: 'Century Achiever',
    code: 'CENTURY_ACHIEVER',
    description: 'Earned over 100 recognition points from your peers',
    icon: 'trophy',
    category: 'milestone',
    pointsBonus: 25,
  },
  {
    name: 'Teamwork Champion',
    code: 'TEAMWORK_CHAMPION',
    description: 'Recognized 5+ times for living the #Teamwork value',
    icon: 'users',
    category: 'values',
    pointsBonus: 15,
  },
  {
    name: 'Innovation Pioneer',
    code: 'INNOVATION_PIONEER',
    description: 'Recognized 5+ times for living the #Innovation value',
    icon: 'lightbulb',
    category: 'values',
    pointsBonus: 15,
  },
  {
    name: 'Customer Champion',
    code: 'CUSTOMER_CHAMPION',
    description: 'Recognized 5+ times for living the #CustomerObsession value',
    icon: 'heart',
    category: 'values',
    pointsBonus: 15,
  },
];

module.exports = {
  DEPARTMENTS,
  COMPANY_VALUE_TAGS,
  REACTION_TYPES,
  BADGE_CATEGORIES,
  TRANSACTION_TYPES,
  WALLET_TYPES,
  POINT_TIERS,
  DEFAULT_MONTHLY_ALLOWANCE,
  DEFAULT_EARNED_POINTS,
  SYSTEM_BADGES,
};
