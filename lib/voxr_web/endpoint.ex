defmodule VoxrWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :voxr

  socket "/socket", VoxrWeb.UserSocket,
    websocket: true,
    longpoll: false

  # Serve user uploads from the configured storage dir. Plug.Static is
  # initialized at compile time in prod, so these read compile-time config:
  # nil (dev) falls back to the priv tree, a configured base (prod) points at
  # the volume-mounted path. Keep in sync with Voxr.Storage.dir/1.
  @uploads_from (case Application.compile_env(:voxr, :storage_dir) do
                   nil -> {:voxr, "priv/static/uploads"}
                   base -> Path.join(base, "uploads")
                 end)

  @emojis_from (case Application.compile_env(:voxr, :storage_dir) do
                  nil -> {:voxr, "priv/static/emojis"}
                  base -> Path.join(base, "emojis")
                end)

  plug Plug.Static,
    at: "/uploads",
    from: @uploads_from,
    gzip: false

  plug Plug.Static,
    at: "/emojis",
    from: @emojis_from,
    gzip: false

  plug CORSPlug, origin: "*"

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug Plug.MethodOverride
  plug Plug.Head
  plug VoxrWeb.Router
end
