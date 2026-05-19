import Config

config :voxr, Voxr.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "voxr_dev",
  stacktrace: true,
  show_sensitive_data_on_connection_error: true,
  pool_size: 10

config :voxr, VoxrWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}],
  check_origin: false,
  code_reloader: true,
  debug_errors: true,
  secret_key_base: "epe2GqeIFN9PP4nVGpFH0vAa603clorhrYA+0KRJDXBsu9bkmPzLNndQVriTvmS6",
  watchers: []

config :logger, :default_formatter, format: "[$level] $message\n"
config :phoenix, :stacktrace_depth, 20
config :phoenix, :plug_init_mode, :runtime
