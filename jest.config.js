module.exports = {
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^\\$m(.*)$': '<rootDir>/src/Models$1',
    '^\\$c(.*)$': '<rootDir>/src/Controllers$1',
  },
}
