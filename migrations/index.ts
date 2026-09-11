import * as migration_20260911_132233_initial_blog from './20260911_132233_initial_blog';

export const migrations = [
  {
    up: migration_20260911_132233_initial_blog.up,
    down: migration_20260911_132233_initial_blog.down,
    name: '20260911_132233_initial_blog'
  },
];
