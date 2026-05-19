defmodule Voxr.Repo do
  use Ecto.Repo,
    otp_app: :voxr,
    adapter: Ecto.Adapters.Postgres
end
