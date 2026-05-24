defmodule VoxrWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :voxr

  socket "/socket", VoxrWeb.UserSocket,
    websocket: true,
    longpoll: false

  plug Plug.Static,
    at: "/uploads",
    from: {:voxr, "priv/static/uploads"},
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
