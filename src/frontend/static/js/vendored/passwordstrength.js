// https://github.com/deanilvincent/check-password-strength/blob/master/src/index.js
// MIT Licence Copyright (c) 2020 Mark Deanil Vicente
// Modified by SkyTheCodeMaster 2024 - Change camelCase to snake_case

const default_options = [
  {
    id: 0,
    value: "Too weak",
    min_diversity: 0,
    min_length: 0
  },
  {
    id: 1,
    value: "Weak",
    min_diversity: 2,
    min_length: 6
  },
  {
    id: 2,
    value: "Medium",
    min_diversity: 4,
    min_length: 8
  },
  {
    id: 3,
    value: "Strong",
    min_diversity: 4,
    min_length: 10
  }
]

const password_strength = (password, options = default_options) => {
  let password_copy = password || '';

  const rules = [
    {
      regex: "[a-z]",
      message: 'lowercase'
    },
    {
      regex: '[A-Z]',
      message: 'uppercase'
    },
    {
      regex: '[0-9]',
      message: 'number'
    },
    {
      regex: "[^a-zA-Z0-9]",
      message: 'symbol'
    }
  ];

  let strength = {};

  strength.contains = rules
    .filter(rule => new RegExp(`${rule.regex}`).test(password_copy))
    .map(rule => rule.message);

  strength.length = password_copy.length;

  let fulfilled_options = options
    .filter(option => strength.contains.length >= option.min_diversity)
    .filter(option => strength.length >= option.min_length)
    .sort((o1, o2) => o2.id - o1.id);
    //.map(option => ({ id: option.id, value: option.value }));

  Object.assign(strength, fulfilled_options[0]);

  return strength;
};