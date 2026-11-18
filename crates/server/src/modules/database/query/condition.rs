/// A row filter: one comparison on a column, or a group of conditions joined by AND / OR.
#[derive(Debug, PartialEq, Eq)]
pub enum Condition {
    Filter(Filter),
    Group(ConditionGroup),
}

#[derive(Debug, PartialEq, Eq)]
pub struct ConditionGroup {
    pub kind: GroupKind,
    pub is_negated: bool,
    pub conditions: Vec<Condition>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GroupKind {
    And,
    Or,
}

/// `column=[not.]operator.value`.
#[derive(Debug, PartialEq, Eq)]
pub struct Filter {
    pub column: String,
    pub is_negated: bool,
    pub operation: Operation,
}

/// Values stay text: Postgres casts them to the column's type, and refuses what does not fit.
#[derive(Debug, PartialEq, Eq)]
pub enum Operation {
    Compare(Comparison, String),
    Like(String),
    CaseInsensitiveLike(String),
    In(Vec<String>),
    Is(IsValue),
    Contains(String),
    ContainedBy(String),
    Overlaps(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Comparison {
    Equal,
    NotEqual,
    Greater,
    GreaterOrEqual,
    Less,
    LessOrEqual,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IsValue {
    Null,
    True,
    False,
    Unknown,
}

impl Comparison {
    pub fn sql_operator(self) -> &'static str {
        match self {
            Self::Equal => "=",
            Self::NotEqual => "<>",
            Self::Greater => ">",
            Self::GreaterOrEqual => ">=",
            Self::Less => "<",
            Self::LessOrEqual => "<=",
        }
    }
}

impl IsValue {
    pub fn sql_keyword(self) -> &'static str {
        match self {
            Self::Null => "NULL",
            Self::True => "TRUE",
            Self::False => "FALSE",
            Self::Unknown => "UNKNOWN",
        }
    }
}

impl GroupKind {
    pub fn sql_keyword(self) -> &'static str {
        match self {
            Self::And => " AND ",
            Self::Or => " OR ",
        }
    }
}
