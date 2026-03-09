//! Token 计数与费用计算
//!
//! 使用 BigDecimal 保证财务精度（f64 会有累积误差）。
//!
//! 公式：`cost = (input/1000) × input_price + (output/1000) × output_price`

use bigdecimal::BigDecimal;

use crate::db::ModelPricingInfo;
use crate::router::ModelTier;

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

/// 计算相对于基准模型的节省费用
pub fn compute_savings(
    input_tokens:  i32,
    output_tokens: i32,
    actual_cost:   &BigDecimal,
    _tier:          ModelTier,
    baseline_pricing: &ModelPricingInfo,
) -> BigDecimal {
    let baseline_cost = compute_cost(input_tokens, output_tokens, baseline_pricing);
    if baseline_cost > *actual_cost {
        baseline_cost - actual_cost
    } else {
        BigDecimal::from(0)
    }
}
