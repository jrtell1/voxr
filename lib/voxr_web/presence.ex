defmodule VoxrWeb.Presence do
  use Phoenix.Presence,
    otp_app: :voxr,
    pubsub_server: Voxr.PubSub
end
