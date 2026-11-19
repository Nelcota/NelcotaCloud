use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::app_state::AppState;
use crate::modules::database::routes::admin::add_column;
use crate::modules::database::routes::admin::apply_migration;
use crate::modules::database::routes::admin::change_table;
use crate::modules::database::routes::admin::create_policy;
use crate::modules::database::routes::admin::create_table;
use crate::modules::database::routes::admin::drop_column;
use crate::modules::database::routes::admin::drop_policy;
use crate::modules::database::routes::admin::drop_table;
use crate::modules::database::routes::admin::list_migrations;
use crate::modules::database::routes::admin::read_schema;
use crate::modules::database::routes::admin::run_sql;
use crate::modules::database::routes::data_api::call_function;
use crate::modules::database::routes::data_api::delete_rows;
use crate::modules::database::routes::data_api::insert_rows;
use crate::modules::database::routes::data_api::read_rows;
use crate::modules::database::routes::data_api::update_rows;

/// Every endpoint of this module; `router.rs` merges it into the API.
pub fn database_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(
            read_rows::read_rows,
            insert_rows::insert_rows,
            update_rows::update_rows,
            delete_rows::delete_rows
        ))
        .routes(routes!(call_function::call_function))
        .routes(routes!(read_schema::read_schema))
        .routes(routes!(create_table::create_table))
        .routes(routes!(drop_table::drop_table, change_table::change_table))
        .routes(routes!(add_column::add_column))
        .routes(routes!(drop_column::drop_column))
        .routes(routes!(create_policy::create_policy))
        .routes(routes!(drop_policy::drop_policy))
        .routes(routes!(run_sql::run_sql))
        .routes(routes!(list_migrations::list, apply_migration::apply))
}
