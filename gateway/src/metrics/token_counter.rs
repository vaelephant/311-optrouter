//! Token 计数与费用计算
//!
//! 使用 BigDecimal 保证财务精度（f64 会有累积误差）。
//!
//! 公式：`cost = (input/1000) × input_price + (output/1000) × output_price`

use bigdecimal::BigDecimal;

use crate::db::ModelPricingInfo;

/// 计算本次调用的费用
pub fn compute_cost(
    input_tokens:  i32,
    output_tokens: i32,
    pricing:       &ModelPricingInfo,
) -> BigDecimal {
    let k = BigDecimal::from(1000i32);
    (&BigDecimal::from(input_tokens)  / &k) * &pricing.input_price
    + (&BigDecimal::from(output_tokens) / &k) * &pricing.output_price
}
