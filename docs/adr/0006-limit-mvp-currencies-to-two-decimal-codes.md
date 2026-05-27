# Limit MVP Currencies to supported two-decimal codes

SettleUp will support AUD, USD, EUR, GBP, and NZD for the MVP. These Currencies all use two decimal minor units in the current product model, which keeps amount parsing, Balance calculation, and Suggested Settlement display aligned while the app stays focused on one-Currency Events. Other three-letter Currency codes will be rejected until the product deliberately adds metadata for non-two-decimal minor units or broader Currency support.
