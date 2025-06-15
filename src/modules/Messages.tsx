import { FC } from 'react';
import type { ChatCompletionMessageParam } from '@mlc-ai/web-llm';
import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionUserMessageParam,
} from '@mlc-ai/web-llm/lib/openai_api_protocols/chat_completion';
import Markdown from 'react-markdown';

type UserMessageProps = {
  message: ChatCompletionUserMessageParam;
};

const UserMessage: FC<UserMessageProps> = ({ message }) => {
  return (
    <div className="w-fit max-w-10/12 bg-stone-700 py-2 px-4 rounded-md ml-auto text-white">
      {typeof message.content === 'string'
        ? message.content
        : JSON.stringify(message.content, null, 2)}
    </div>
  );
};

type AssistantMessageProps = {
  message: ChatCompletionAssistantMessageParam;
};

const AssistantMessage: FC<AssistantMessageProps> = ({ message }) => {
  return (
    <div className="rich-text text-stone-200 mb-10 max-w-10/12">
      <Markdown>{message.content}</Markdown>
    </div>
  );
};

type MessagesProps = {
  messages: ChatCompletionMessageParam[];
};

const Messages: FC<MessagesProps> = (props) => {
  const { messages } = props;
  console.log({ messages });

  return (
    <div className="flex flex-col my-4 gap-5">
      {messages.map((message, idx) => {
        switch (message.role) {
          case 'user':
            return <UserMessage key={idx} message={message} />;
          case 'assistant':
            return <AssistantMessage key={idx} message={message} />;
          default:
            return null;
        }
      })}
    </div>
  );
};

export default Messages;
