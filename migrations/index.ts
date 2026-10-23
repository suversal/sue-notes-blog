import * as migration_20260911_132233_initial_blog from './20260911_132233_initial_blog';
import * as migration_20260913_120000_article_cover from './20260913_120000_article_cover';
import * as migration_20260913_150000_article_view_days from './20260913_150000_article_view_days';
import * as migration_20260914_134302_explore_items from './20260914_134302_explore_items';
import * as migration_20260920_010000_article_pin_priority from './20260920_010000_article_pin_priority';
import * as migration_20260920_011000_article_pin_priority_order from './20260920_011000_article_pin_priority_order';
import * as migration_20261011_120000_uses_and_site_rename from './20261011_120000_uses_and_site_rename';
import * as migration_20261012_120000_users_reset_password_requested_at from './20261012_120000_users_reset_password_requested_at';
import * as migration_20261023_120000_friend_links from './20261023_120000_friend_links';
import * as migration_20261023_130000_friend_card from './20261023_130000_friend_card';

export const migrations = [
  {
    up: migration_20260911_132233_initial_blog.up,
    down: migration_20260911_132233_initial_blog.down,
    name: '20260911_132233_initial_blog',
  },
  {
    up: migration_20260913_120000_article_cover.up,
    down: migration_20260913_120000_article_cover.down,
    name: '20260913_120000_article_cover',
  },
  {
    up: migration_20260913_150000_article_view_days.up,
    down: migration_20260913_150000_article_view_days.down,
    name: '20260913_150000_article_view_days',
  },
  {
    up: migration_20260914_134302_explore_items.up,
    down: migration_20260914_134302_explore_items.down,
    name: '20260914_134302_explore_items',
  },
  {
    up: migration_20260920_010000_article_pin_priority.up,
    down: migration_20260920_010000_article_pin_priority.down,
    name: '20260920_010000_article_pin_priority',
  },
  {
    up: migration_20260920_011000_article_pin_priority_order.up,
    down: migration_20260920_011000_article_pin_priority_order.down,
    name: '20260920_011000_article_pin_priority_order',
  },
  {
    up: migration_20261011_120000_uses_and_site_rename.up,
    down: migration_20261011_120000_uses_and_site_rename.down,
    name: '20261011_120000_uses_and_site_rename',
  },
  {
    up: migration_20261012_120000_users_reset_password_requested_at.up,
    down: migration_20261012_120000_users_reset_password_requested_at.down,
    name: '20261012_120000_users_reset_password_requested_at',
  },
  {
    up: migration_20261023_120000_friend_links.up,
    down: migration_20261023_120000_friend_links.down,
    name: '20261023_120000_friend_links',
  },
  {
    up: migration_20261023_130000_friend_card.up,
    down: migration_20261023_130000_friend_card.down,
    name: '20261023_130000_friend_card',
  },
];
