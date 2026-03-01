export function isPremium(user: { subscription_status?: string }): boolean {
  return user?.subscription_status === 'active';
}
