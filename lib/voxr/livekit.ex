defmodule Voxr.LiveKit do
  def generate_token(user_id, display_name, room_name) do
    api_key = Application.get_env(:voxr, :livekit_api_key)
    api_secret = Application.get_env(:voxr, :livekit_api_secret)
    now = System.system_time(:second)

    claims = %{
      "iss" => api_key,
      "sub" => to_string(user_id),
      "iat" => now,
      "exp" => now + 3600,
      "name" => display_name,
      "video" => %{
        "roomJoin" => true,
        "room" => room_name,
        "canPublish" => true,
        "canSubscribe" => true
      }
    }

    signer = Joken.Signer.create("HS256", api_secret)

    case Joken.encode_and_sign(claims, signer) do
      {:ok, token, _} -> {:ok, token}
      {:error, reason} -> {:error, reason}
    end
  end
end
